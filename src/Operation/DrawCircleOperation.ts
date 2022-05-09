import * as THREE from "three";
import { occApp } from "../occApp";
import { occShape } from "../occShape";
import { OperationBase } from "./OperationBase";
import { OperationType } from "./OperationType";

export class DrawCircleOperation extends OperationBase {


    public tempGeometry: THREE.BufferGeometry;

    public drawPoints: THREE.Vector3[] = [];
    constructor() {
        super();
        this.operationType = OperationType.DrawCircle;

        this.tempGeometry = new THREE.BufferGeometry();
        let line = new THREE.LineSegments(this.tempGeometry, occShape.lineMaterial);
        occApp.scene.scene.add(line);
    }


    protected enter(): void 
    {       
        super.enter();
    }
    protected onMouseMove(event: MouseEvent) {
        super.onMouseMove(event); 
        let v=this.movePoint == null ? occApp.scene.getIntersect(event) : this.movePoint;
        if (this.drawPoints.length > 0) {
            this.addTempCurve(this.drawPoints[0], v);
        }
    }
    protected onMouseUp(event: MouseEvent) {
        if (event.button != 0&&event.button != 2) return;
        if (event.button == 2) {
            this.changeOperation();
            return;
        }
        let mousePoint=this.movePoint == null ? occApp.scene.getIntersect(event) : this.movePoint;
        if (this.drawPoints.length == 0) {
            this.drawPoints.push(mousePoint);
        }
        else {
            let ax2=new occApp.oc.gp_Ax2_3(new occApp.oc.gp_Pnt_3(this.drawPoints[0].x,this.drawPoints[0].y,this.drawPoints[0].z),new occApp.oc.gp_Dir_4(0,0,1));
            let radius= this.drawPoints[0].distanceTo(mousePoint);
            let circle=new occApp.oc.GC_MakeCircle_2(ax2,radius).Value();
            let curve=  new occApp.oc.Handle_Geom_Curve_2(circle.get())
            let edge = new occApp.oc.BRepBuilderAPI_MakeEdge_24(curve).Edge();
            if (!edge.IsNull()) {
                let obj = new occShape();
                obj.addTopoShapeToSence(edge,curve);
            }
            this.drawPoints = [];
        }
    }



    private addTempCurve(startPoint: THREE.Vector3, endPoint: THREE.Vector3) {
        let radius= startPoint.distanceTo(endPoint);
        if(radius<=0)return;
        let ax2=new occApp.oc.gp_Ax2_3(new occApp.oc.gp_Pnt_3(startPoint.x,startPoint.y,startPoint.z),new occApp.oc.gp_Dir_4(0,0,1));
        let circle=new occApp.oc.GC_MakeCircle_2(ax2,radius).Value();
        let curve=  new occApp.oc.Handle_Geom_Curve_2(circle.get())
        let edge = new occApp.oc.BRepBuilderAPI_MakeEdge_24(curve).Edge();
        this.tempGeometry.setFromPoints(occShape.edgeOfVector3(edge));
        circle.delete();
        edge.delete();
        ax2.delete();
    }

    protected quit(): void 
    {
        super.quit();
        this.tempGeometry.setFromPoints([]);
        this.drawPoints = [];
    }
}