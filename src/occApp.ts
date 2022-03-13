import { ThreeScene } from "./ThreeScene";
import { OperationBase } from "./Operation/OperationBase";
import { DrawWallOperation } from "./Operation/DrawLineOperation";
import { OperationType } from "./Operation/OperationType";
import { OpenCascadeInstance, TopoDS_Shape, XSControl_Reader } from "opencascade.js";
import { occShape } from "./occShape";
import { DrawCircleOperation } from "./Operation/DrawCircleOperation";
import { DrawRectOperation } from "./Operation/DrawRectOperation";
import { DrawBSplineOperation } from "./Operation/DrawBSplineOperation";
import { DrawArcOfCircleOperation } from "./Operation/DrawArcOfCircleOperation";
import { DrawEllipseOperation } from "./Operation/DrawEllipseOperation";

export class occApp {

  public static loadFiles(files) {

    const loadFileAsync = async (file) => {
      return new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
      })
    }
    for (let i = 0; i < files.length; i++) {
      var lastImportedShape = null;
      loadFileAsync(files[i]).then(async (fileText) => {
        let fileName = files[i].name;
        if (fileName.toLowerCase().includes(".stl")) {
          lastImportedShape = occApp.importSTL(fileName, fileText);
        } else {
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