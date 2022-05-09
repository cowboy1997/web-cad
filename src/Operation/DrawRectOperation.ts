import { gp_Pnt } from "opencascade.js";
import * as THREE from "three";
import { occApp } from "../occApp";
import { occShape } from "../occShape";
import { OperationBase } from "./OperationBase";
import { OperationType } from "./OperationType";

export class DrawRectOperation extends OperationBase {


    public tempGeometry: THREE.BufferGeometry;

    public drawPoints: THREE.Vector3[] = [];
    constructor() {
        super();
        this.operationType = OperationType.DrawRect;

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
        if (this.drawPoints.length > 0) {
            let v=this.movePoint == null ? occApp.scene.getIntersect(event) : this.movePoint;
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

            let dis= this.drawPoints[0].distanceTo(mousePoint);
            if(dis<=0)return;
            let P0 =  new occApp.oc.gp_Pnt_3(this.drawPoints[0].x, this.drawPoints[0].y, this.drawPoints[0].z);
            let P1 = new occApp.oc.gp_Pnt_3(mousePoint.x,this.drawPoints[0].y,0);
            let P2 = new occApp.oc.gp_Pnt_3(mousePoint.x, mousePoint.y, mousePoint.z);
            let P3 =  new occApp.oc.gp_Pnt_3(this.drawPoints[0].x,mousePoint.y,0);
            this.creatEdge(P0,P1);
            this.creatEdge(P1,P2);
            this.creatEdge(P2,P3);
            this.creatEdge(P3,P0);
            this.drawPoints = [];
        }
    }

    private creatEdge(P0:gp_Pnt,P1:gp_Pnt)
    {
        let aSegment = new occApp.oc.GC_MakeSegment_1(P0, P1).Value();
        let curve=  new occApp.oc.Handle_Geom_Curve_2(aSegment.get());
        let edge = new occApp.oc.BRepBuilderAPI_MakeEdge_24(curve).Edge();
        let obj = new occShape();
        obj.addTopoShapeToSence(edge,curve);
    }


    private addTempCurve(startPoint: THREE.Vector3, endPoint: THREE.Vector3) {
        let dis= startPoint.distanceTo(endPoint);
        if(dis<=0)return;
        let P0 = startPoint;
        let P1 = new THREE.Vector3(endPoint.x,startPoint.y,0);
        let P2 = endPoint;
        let P3 = new THREE.Vector3(startPoint.x,endPoint.y,0);
        this.tempGeometry.setFromPoints([P0, P1,P1,P2,P2,P3,P3,P0]);
    }

    protected quit(): void 
    {
        super.quit();
        this.tempGeometry.setFromPoints([]);
        this.drawPoints = [];
    }
}