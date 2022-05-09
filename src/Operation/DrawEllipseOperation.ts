import * as THREE from "three";
import { occApp } from "../occApp";
import { occShape } from "../occShape";
import { OperationBase } from "./OperationBase";
import { OperationType } from "./OperationType";

export class DrawEllipseOperation extends OperationBase {


    public tempGeometry: THREE.BufferGeometry;

    public drawPoints: THREE.Vector3[] = [];
    constructor() {
        super();
        this.operationType = OperationType.DrawEllipse;

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

            let div1=this.drawPoints[1].clone().sub(this.drawPoints[0]);
            let div2=v.clone().sub(this.drawPoints[0]);
            let cos=div1.clone().cross(div2);
            let majorRadius= div1.length();
            let minorRadius= cos.length()/majorRadius;
            if(majorRadius>minorRadius)
            {
                div1= div1.normalize();
            }
            else
            {
                div1.cross(new THREE.Vector3(0,0,1));
                let temp=majorRadius;
                majorRadius=minorRadius;
                minorRadius=temp;
            }
            this.addTempEllipse(this.drawPoints[0],div1,majorRadius,minorRadius);
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
            let div1=this.drawPoints[1].clone().sub(this.drawPoints[0]);
            let div2=mousePoint.clone().sub(this.drawPoints[0]);
            let cos=div1.clone().cross(div2);
            let majorRadius= div1.length();
            let minorRadius= cos.length()/majorRadius;
            if(majorRadius>minorRadius)
            {
                div1= div1.normalize();
            }
            else
            {
                div1.cross(new THREE.Vector3(0,0,1));
                let temp=majorRadius;
                majorRadius=minorRadius;
                minorRadius=temp;
            }
            let Vx = new occApp.oc.gp_Dir_4(div1.x,div1.y,div1.z);
            let Center =  new occApp.oc.gp_Pnt_3(this.drawPoints[0].x,this.drawPoints[0].y,this.drawPoints[0].z);
            let ax2=new occApp.oc.gp_Ax2_2(Center,new occApp.oc.gp_Dir_4(0,0,1),Vx);
            let circle=new occApp.oc.GC_MakeEllipse_2(ax2,majorRadius,minorRadius).Value();
            let curve=  new occApp.oc.Handle_Geom_Curve_2(circle.get())
            let edge = new occApp.oc.BRepBuilderAPI_MakeEdge_24(curve).Edge();
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

    private addTempEllipse(center: THREE.Vector3,vx: THREE.Vector3,MajorRadius:number,MinorRadius:number) {
        let Vx = new occApp.oc.gp_Dir_4(vx.x,vx.y,vx.z);
        let Center =  new occApp.oc.gp_Pnt_3(center.x,center.y,center.z);
        let ax2=new occApp.oc.gp_Ax2_2(Center,new occApp.oc.gp_Dir_4(0,0,1),Vx);
        let circle=new occApp.oc.GC_MakeEllipse_2(ax2,MajorRadius,MinorRadius).Value();
        let curve=  new occApp.oc.Handle_Geom_Curve_2(circle.get())
        let edge = new occApp.oc.BRepBuilderAPI_MakeEdge_24(curve).Edge();
        this.tempGeometry.setFromPoints(occShape.edgeOfVector3(edge));
        circle.delete();
        curve.delete();
        edge.delete();
        Vx.delete();
        ax2.delete();
    }

    protected quit(): void 
    {
        super.quit();
        this.tempGeometry.setFromPoints([]);
        this.drawPoints = [];
    }
}