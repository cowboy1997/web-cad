import * as THREE from "three";
import { occApp } from "../occApp";
import { occShape } from "../occShape";
import { OperationBase } from "./OperationBase";
import { OperationType } from "./OperationType";

export class DrawArcOfCircleOperation extends OperationBase {


    public tempGeometry: THREE.BufferGeometry;

    public drawPoints: THREE.Vector3[] = [];
    constructor() {
        super();
        this.operationType = OperationType.DrawArcOfCircle;

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
        if (this.drawPoints.length == 1) {
            this.addTempLine(this.drawPoints[0], v);
        }
        else if (this.drawPoints.length == 2)
        {
            this.addTempArcOfCircle(this.drawPoints[0],v,this.drawPoints[1]);
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
        else if (this.drawPoints.length == 1) {
            this.drawPoints.push(mousePoint);
        }
        else {
            let P0 =  new occApp.oc.gp_Pnt_3(this.drawPoints[0].x,this.drawPoints[0].y,this.drawPoints[0].z);
            let P1 = new occApp.oc.gp_Pnt_3(mousePoint.x,mousePoint.y,mousePoint.z);
            let P3  =  new occApp.oc.gp_Pnt_3(this.drawPoints[1].x,this.drawPoints[1].y,this.drawPoints[1].z);
            let circle=new occApp.oc.GC_MakeArcOfCircle_4(P0,P1,P3).Value();
            let curve=  new occApp.oc.Handle_Geom_Curve_2(circle.get())
            let edge = new occApp.oc.BRepBuilderAPI_MakeEdge_24(curve).Edge();
            this.tempGeometry.setFromPoints(occShape.edgeOfVector3(edge));
            if (!edge.IsNull()) {
                let obj = new occShape();
                obj.addTopoShapeToSence(edge,curve);
            }
            this.drawPoints = [];
        }
    }




    private addTempLine(startPoint: THREE.Vector3, endPoint: THREE.Vector3) {
        let dis= startPoint.distanceTo(endPoint);
        if(dis<=0)return;
        this.tempGeometry.setFromPoints([startPoint, endPoint]);
    }

    private addTempArcOfCircle(p1: THREE.Vector3, p2: THREE.Vector3,p3: THREE.Vector3) {
        let P0 =  new occApp.oc.gp_Pnt_3(p1.x,p1.y,p1.z);
        let P1 = new occApp.oc.gp_Pnt_3(p2.x,p2.y,p2.z);
        let P3  =  new occApp.oc.gp_Pnt_3(p3.x,p3.y,p3.z);

        let circle=new occApp.oc.GC_MakeArcOfCircle_4(P0,P1,P3).Value();
        let curve=  new occApp.oc.Handle_Geom_Curve_2(circle.get())
        let edge = new occApp.oc.BRepBuilderAPI_MakeEdge_24(curve).Edge();
        this.tempGeometry.setFromPoints(occShape.edgeOfVector3(edge));


        circle.delete();
        curve.delete();
        edge.delete();
    }

    protected quit(): void 
    {
        super.quit();
        this.tempGeometry.setFromPoints([]);
        this.drawPoints = [];
    }
}