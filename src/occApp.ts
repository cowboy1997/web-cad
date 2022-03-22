import { ThreeScene } from "./ThreeScene";
import { OperationBase } from "./Operation/OperationBase";
import { DrawWallOperation } from "./Operation/DrawLineOperation";
import { OperationType } from "./Operation/OperationType";
import { gp_Pnt, OpenCascadeInstance, TopoDS_Shape } from "opencascade.js";
import { occShape } from "./occShape";
import { DrawCircleOperation } from "./Operation/DrawCircleOperation";
import { DrawRectOperation } from "./Operation/DrawRectOperation";
import { DrawBSplineOperation } from "./Operation/DrawBSplineOperation";
import { DrawArcOfCircleOperation } from "./Operation/DrawArcOfCircleOperation";
import { DrawEllipseOperation } from "./Operation/DrawEllipseOperation";
import DxfParser, { IArcEntity, ICircleEntity, IDxf, IEllipseEntity, IEntity, IInsertEntity, ILineEntity, IPolylineEntity, ISplineEntity } from "dxf-parser";
import * as THREE from "three";


export class occApp {

  public static loadFiles(files) {

    const loadFileAsync = async (file) => {
      return new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        if(file.name.toLowerCase().includes(".dwg"))
        {
          reader.readAsArrayBuffer(file);
        }
        else
        {
          reader.readAsText(file);
        }
      })
    }

    occApp.scene.clearObject();
    for (let i = 0; i < files.length; i++) {
      var lastImportedShape = null;
      var file=files[i];
      loadFileAsync(file).then(async (fileText) => {
        let fileName =file.name;
        if (fileName.toLowerCase().includes(".stl"))
        {
          lastImportedShape = occApp.importSTL(fileName, fileText);
        }
        else if (fileName.toLowerCase().includes(".dxf"))
        {
          lastImportedShape = occApp.parseDXF(fileText as any);
        }
        else if (fileName.toLowerCase().includes(".dwg"))
        {
          // var binary = '';
          // var bytes = new Uint8Array(fileText as any);
          // var len = bytes.byteLength;
          // for (var i = 0; i < len; i++) {
          //   binary += String.fromCharCode(bytes[i]);
          // }
          // let base64_code = window.btoa(binary);
          lastImportedShape = occApp.parseDwg(fileText as any);
        }
        else 
        {
          lastImportedShape = occApp.importSTEPorIGES(fileName, fileText);
        }
      }).then(async () => {
        if (lastImportedShape) {
          let obj = new occShape();
          obj.addTopoShapeToSence(lastImportedShape);
          occApp.scene.setCamera();
        }
      });
    };
  }

  public static importSTEPorIGES(fileName, fileText): TopoDS_Shape {
    // Writes the uploaded file to Emscripten's Virtual Filesystem
    occApp.oc.FS.createDataFile("/", fileName, fileText, true, true, true);

    // Choose the correct OpenCascade file parsers to read the CAD file
    var reader = null; let tempFilename = fileName.toLowerCase();
    if (tempFilename.endsWith(".step") || tempFilename.endsWith(".stp")) {
      reader = new occApp.oc.STEPControl_Reader_1();
    } else if (tempFilename.endsWith(".iges") || tempFilename.endsWith(".igs")) {
      reader = new occApp.oc.IGESControl_Reader_1();
    } else { console.error("opencascade.js can't parse this extension! (yet)"); }

    let readResult = reader.ReadFile(fileName);            // Read the file
    if (readResult === occApp.oc.IFSelect_ReturnStatus.IFSelect_RetDone) {
      console.log(fileName + " loaded successfully!     Converting to OCC now...");
      // Translate all transferable roots to OpenCascade
      reader.TransferRoots(new occApp.oc.Message_ProgressRange_1());
      let stepShape = reader.OneShape();         // Obtain the results of translation in one OCCT shape
      occApp.oc.FS.unlink("/" + fileName);
      return stepShape;
    } else {
      console.error("Something in OCCT went wrong trying to read " + fileName);
      return null;
    }
  }

  public static importSTL(fileName, fileText): TopoDS_Shape {
    // Writes the uploaded file to Emscripten's Virtual Filesystem
    occApp.oc.FS.createDataFile("/", fileName, fileText, true, true, true);

    // Choose the correct OpenCascade file parsers to read the STL file
    var reader = new occApp.oc.StlAPI_Reader();
    let readShape = new occApp.oc.TopoDS_Shape();

    if (reader.Read(readShape, fileName)) {
      console.log(fileName + " loaded successfully!     Converting to OCC now...");
      // Convert Shell to Solid as is expected
      let solidSTL = new occApp.oc.BRepBuilderAPI_MakeSolid();
      solidSTL.Add(readShape);
      occApp.oc.FS.unlink("/" + fileName);
      return solidSTL.Solid()
    } else {
      console.log("Something in OCCT went wrong trying to read " + fileName + ".  \n" +
        "Cascade Studio only imports small ASCII stl files for now!");
      return null;
    }
  }


  public static parseDwg(base64:string) 
  {

    DwgApi.createDataFile("./test.dwg",base64);
    let dxfData= DwgApi.dwg2dxf("./test.dwg");
    DwgApi.deleteFile("./test.dwg");
    this.parseDXF(dxfData);
  }


  private static parseDXF(DxfData:string)
  {
    let parser:DxfParser=null
    try {
      parser = new DxfParser();
    } catch (error) {
      console.log(error);
      return;
    }
    parser = new DxfParser();
    let dxf = parser.parseSync(DxfData);
    this.parseEntities(dxf.entities,dxf);
  }



  private static parseEntities(entities:IEntity[],dxf:IDxf)
  {
    for (let entity of entities) {
      if (entity.type == "LINE") {
        let line = entity as ILineEntity;
        let aP1 = new occApp.oc.gp_Pnt_3(line.vertices[0].x, line.vertices[0].y, line.vertices[0].z == null ? 0 : line.vertices[0].z);
        let aP2 = new occApp.oc.gp_Pnt_3(line.vertices[1].x, line.vertices[1].y, line.vertices[1].z == null ? 0 : line.vertices[1].z);
        let aSegment12 = new occApp.oc.GC_MakeSegment_1(aP1, aP2).Value();
        let Curve = new occApp.oc.Handle_Geom_Curve_2(aSegment12.get());
        let edge = new occApp.oc.BRepBuilderAPI_MakeEdge_24(Curve).Edge();
        if (!edge.IsNull()) {
          let obj = new occShape();
          obj.addTopoShapeToSence(edge);
        }
      }
      else if (entity.type == "CIRCLE") {
        let circleEntity = entity as ICircleEntity;
        let ax2 = new occApp.oc.gp_Ax2_3(new occApp.oc.gp_Pnt_3(circleEntity.center.x, circleEntity.center.y, circleEntity.center.z == null ? 0 : circleEntity.center.z), new occApp.oc.gp_Dir_4(0, 0, 1));
        let radius = circleEntity.radius;
        let circle = new occApp.oc.GC_MakeCircle_2(ax2, radius).Value();
        let curve = new occApp.oc.Handle_Geom_Curve_2(circle.get())
        let edge = new occApp.oc.BRepBuilderAPI_MakeEdge_24(curve).Edge();
        if (!edge.IsNull()) {
          let obj = new occShape();
          obj.addTopoShapeToSence(edge);
        }
      }
      else if (entity.type == "LWPOLYLINE") {
        let poly = entity as IPolylineEntity;
        let numV = poly.vertices.length;
        if (numV == 0) continue;

        let makeWire = new occApp.oc.BRepBuilderAPI_MakeWire_1()
        let start = poly.vertices[0];
        start.z = start.z == null ? 0 : start.z
        for (let index = 1; index < numV; index++) {
          let end = poly.vertices[index];
          end.z = end.z == null ? 0 : end.z;
          let aP1 = new occApp.oc.gp_Pnt_3(start.x, start.y, start.z);
          let aP2 = new occApp.oc.gp_Pnt_3(end.x, end.y, end.z);
          let edge = this.creatEdge(aP1, aP2);
          makeWire.Add_1(edge.Edge());
          start = end;
        }

        let aP1 = new occApp.oc.gp_Pnt_3(start.x, start.y, start.z);
        let aP2 = new occApp.oc.gp_Pnt_3(poly.vertices[0].x, poly.vertices[0].y, poly.vertices[0].z == null ? 0 : poly.vertices[0].z);
        let edge = this.creatEdge(aP1, aP2);
        makeWire.Add_1(edge.Edge());

        if (!makeWire.Wire().IsNull()) {
          let obj = new occShape();
          obj.addTopoShapeToSence(makeWire.Wire());
        }
      }
      else if (entity.type == "SPLINE") {
        let poly = entity as ISplineEntity;

        let array = new occApp.oc.TColgp_Array1OfPnt_2(1, poly.fitPoints.length);
        for (let i = 0; i <   poly.fitPoints.length; i++) {
          let p = poly.fitPoints[i];
          let gp_Pnt = new occApp.oc.gp_Pnt_3(p.x, p.y, p.z);
          array.SetValue(1 + i, gp_Pnt);
        }
        let bSpline = new occApp.oc.GeomAPI_PointsToBSpline_2(array, 3, 3, occApp.oc.GeomAbs_Shape.GeomAbs_C2 as any, 1.0e-3);
        let curve = new occApp.oc.Handle_Geom_Curve_2(bSpline.Curve().get());
        let edge = new occApp.oc.BRepBuilderAPI_MakeEdge_24(curve).Edge();
        if (!edge.IsNull()) {
          let obj = new occShape();
          obj.addTopoShapeToSence(edge);
        }
      }
      else if (entity.type == "ARC") {
        let arc = entity as IArcEntity;
        arc.center.z =  arc.center.z== null ? 0 : arc.center.z
        let ax2=new occApp.oc.gp_Ax2_3(new occApp.oc.gp_Pnt_3( arc.center.x ,arc.center.y, arc.center.z),new occApp.oc.gp_Dir_4(0,0,1));
        let c =  new occApp.oc.gp_Circ_2(ax2,arc.radius);
        let circle=new occApp.oc.GC_MakeArcOfCircle_1(c,arc.startAngle,arc.endAngle,true).Value();
        let curve=  new occApp.oc.Handle_Geom_Curve_2(circle.get())
        let edge = new occApp.oc.BRepBuilderAPI_MakeEdge_24(curve).Edge();
        if (!edge.IsNull()) {
          let obj = new occShape();
          obj.addTopoShapeToSence(edge);
        }
      }
      else if (entity.type == "ELLIPSE") {
        let ellipse = entity as IEllipseEntity;
        ellipse.center.z==  ellipse.center.z== null ? 0 : ellipse.center.z


        let Center = new occApp.oc.gp_Pnt_3(ellipse.center.x, ellipse.center.y,ellipse.center.z);
        let majorPoint=new THREE.Vector3(ellipse.majorAxisEndPoint.x,ellipse.majorAxisEndPoint.y,ellipse.majorAxisEndPoint.z);
        let majorRadius=majorPoint.length();
        majorPoint.normalize();
        let Vx = new occApp.oc.gp_Dir_4(majorPoint.x,majorPoint.y,majorPoint.z);
        let ax2 = new occApp.oc.gp_Ax2_2(Center, new occApp.oc.gp_Dir_4(0, 0, 1), Vx);
        let occEllipse =  new occApp.oc.gp_Elips_2(ax2,majorRadius,majorRadius*ellipse.axisRatio);
        let circle = new occApp.oc.GC_MakeArcOfEllipse_1(occEllipse, ellipse.startAngle, ellipse.endAngle,true).Value();
        let curve = new occApp.oc.Handle_Geom_Curve_2(circle.get())
        let edge = new occApp.oc.BRepBuilderAPI_MakeEdge_24(curve).Edge();
        if (!edge.IsNull()) {
          let obj = new occShape();
          obj.addTopoShapeToSence(edge);
        }
      }
      else if (entity.type == "INSERT") {
        let Insert = entity as IInsertEntity;

        let blockName=Insert.name;

        if(dxf.blocks.hasOwnProperty(blockName))
        {
          let a=  dxf.blocks[blockName];
          this.parseEntities(a.entities,dxf);
        }
      }
    }

  }

  private static creatEdge(P0:gp_Pnt,P1:gp_Pnt)
  {
      let aSegment = new occApp.oc.GC_MakeSegment_1(P0, P1).Value();
      let curve=  new occApp.oc.Handle_Geom_Curve_2(aSegment.get());
      let edge = new occApp.oc.BRepBuilderAPI_MakeEdge_24(curve);
      return edge;
  }



  public static scene: ThreeScene;


  public static currentOperation: OperationBase;
  public static allOperation: Map<string, OperationBase>;

  public static Base: OperationBase;
  public static oc: OpenCascadeInstance;

  constructor() {
    occApp.scene = new ThreeScene();
    occApp.allOperation = new Map<string, OperationBase>();

    occApp.Base = new OperationBase();
    occApp.allOperation.set(OperationType.Base, occApp.Base)
    occApp.allOperation.set(OperationType.DrawLine, new DrawWallOperation());
    occApp.allOperation.set(OperationType.DrawArcOfCircle, new DrawArcOfCircleOperation());
    occApp.allOperation.set(OperationType.DrawCircle,new DrawCircleOperation());
    occApp.allOperation.set(OperationType.DrawRect,new DrawRectOperation());
    occApp.allOperation.set(OperationType.DrawBSpline,new DrawBSplineOperation());
    occApp.allOperation.set(OperationType.DrawEllipse,new DrawEllipseOperation());
    occApp.currentOperation = occApp.Base;
    occApp.currentOperation.Enter();
  }






  public static runCommand(data: string) {
    occApp.currentOperation.Quit();
    for (let type of this.allOperation.keys()) {
      if (type == data) {
        occApp.currentOperation = this.allOperation.get(type);
        occApp.currentOperation.Enter();
        return;
      }
    }
  }



}