import { gp_Pnt } from "opencascade.js";
import * as THREE from "three";
import { occApp } from "../occApp";
import { occShape } from "../occShape";
import { OperationBase } from "./OperationBase";
import { OperationType } from "./OperationType";

export class DrawBSplineOperation extends OperationBase {


    public tempGeometry: THREE.BufferGeometry;

    public drawPoints: THREE.Vector3[] = [];
    constructor() {
        super();
        this.operationType = OperationType.DrawBSpline;

        this.tempGeometry = new THREE.BufferGeometry();
        let line = new THREE.LineSegments(this.tempGeometry, occShape.lineMaterial);
        occApp.scene.scene.add(line);
    }


    protected enter(): void 
    {       
        super.enter();
    }
    protected onMouseMove(event: MouseEvent) {
        let v = occApp.scene.getIntersect(event);
        if (this.drawPoints.length > 0) {
            this.addTempCurve(v);
        }
    }
    protected onMouseUp(event: MouseEvent) {
        if (event.button != 0&&event.button != 2) return;
        if (event.button == 2) {
            this.execute(occApp.scene.getIntersect(event));
            this.changeOperation();
            return;
        }
        let mousePoint = occApp.scene.getIntersect(event);
        this.drawPoints.push(mousePoint);
    }

 


    private addTempCurve(endPoint: THREE.Vector3) {
        let array =new occApp.oc.TColgp_Array1OfPnt_2(1,this.drawPoints.length+1);
        for (let i = 0; i < this.drawPoints.length; i++) {
            let p=this.drawPoints[i];
            let gp_Pnt =  new occApp.oc.gp_Pnt_3(p.x, p.y, p.z);
            array.SetValue(1+i,gp_Pnt);         
        }
        let gp_Pnt =  new occApp.oc.gp_Pnt_3(endPoint.x, endPoint.y, endPoint.z);
        array.SetValue(1+this.drawPoints.length,gp_Pnt);
        let bSpline=new occApp.oc.GeomAPI_PointsToBSpline_2(array,3,3, occApp.oc.GeomAbs_Shape.GeomAbs_C2 as any, 1.0e-3 );
        let curve=  new occApp.oc.Handle_Geom_Curve_2(bSpline.Curve().get());
        let edge = new occApp.oc.BRepBuilderAPI_MakeEdge_24(curve).Edge();
        this.tempGeometry.setFromPoints(occShape.edgeOfVector3(edge));
        bSpline.delete();
        curve.delete();
        edge.delete();
        array.delete();
    }


    private execute(endPoint: THREE.Vector3) {
        let array =new occApp.oc.TColgp_Array1OfPnt_2(1,this.drawPoints.length+1);
        for (let i = 0; i < this.drawPoints.length; i++) {
            let p=this.drawPoints[i];
            let gp_Pnt =  new occApp.oc.gp_Pnt_3(p.x, p.y, p.z);
            array.SetValue(1+i,gp_Pnt);         
        }
        let gp_Pnt =  new occApp.oc.gp_Pnt_3(endPoint.x, endPoint.y, endPoint.z);
        array.SetValue(this.drawPoints.length+1,gp_Pnt);
        let bSpline=new occApp.oc.GeomAPI_PointsToBSpline_2(array,3,3, occApp.oc.GeomAbs_Shape.GeomAbs_C2 as any, 1.0e-3 );
        let curve=  new occApp.oc.Handle_Geom_Curve_2(bSpline.Curve().get());
        let edge = new occApp.oc.BRepBuilderAPI_MakeEdge_24(curve).Edge();
        if (!edge.IsNull()) {
            let obj = new occShape();
            obj.addTopoShapeToSence(edge);
        }
        this.drawPoints = [];
    }




    protected quit(): void 
    {
        super.quit();
        this.tempGeometry.setFromPoints([]);
        this.drawPoints = [];
    }
}