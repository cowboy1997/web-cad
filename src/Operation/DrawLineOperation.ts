import * as THREE from "three";
import { occApp } from "../occApp";
import { occShape } from "../occShape";
import { OperationBase } from "./OperationBase";
import { OperationType } from "./OperationType";

export class DrawWallOperation extends OperationBase {


    public tempGeometry: THREE.BufferGeometry;

    public drawPoints: THREE.Vector3[] = [];
    constructor() {
        super();
        this.operationType = OperationType.DrawLine;

        this.tempGeometry = new THREE.BufferGeometry();
        let line = new THREE.LineSegments(this.tempGeometry, occShape.lineMaterial);
        occApp.scene.scene.add(line);
    }


    protected enter(): void 
    {       
        super.enter();
    }



    protected onMouseDown(event: MouseEvent) {

    }
    protected onMouseMove(event: MouseEvent) {
        let v = occApp.scene.getIntersect(event);
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
        let mousePoint = occApp.scene.getIntersect(event);
        if (this.drawPoints.length == 0) {
            this.drawPoints.push(mousePoint);
        }
        else {
            let aP1 = new occApp.oc.gp_Pnt_3(this.drawPoints[0].x, this.drawPoints[0].y, this.drawPoints[0].z);
            let aP2 = new occApp.oc.gp_Pnt_3(mousePoint.x, mousePoint.y, mousePoint.z);
            let aSegment12 = new occApp.oc.GC_MakeSegment_1(aP1, aP2).Value();
            let Curve=  new occApp.oc.Handle_Geom_Curve_2(aSegment12.get());
            let edge = new occApp.oc.BRepBuilderAPI_MakeEdge_24(Curve).Edge();
            if (!edge.IsNull()) {
                let obj = new occShape();
                obj.addTopoShapeToSence(edge);
            }
            this.drawPoints = [];
            this.drawPoints.push(mousePoint);
        }
    }



    private addTempCurve(startPoint: THREE.Vector3, endPoint: THREE.Vector3) {
        let dis= startPoint.distanceTo(endPoint);
        if(dis<=0)return;
        this.tempGeometry.setFromPoints([startPoint, endPoint]);
    }

    protected quit(): void 
    {
        super.quit();
        this.tempGeometry.setFromPoints([]);
        this.drawPoints = [];
    }
}