import { occApp } from "../occApp";
import * as THREE from "three"
import { OperationType } from "./OperationType";

export class OperationBase {

  public ListenerMouseDown = null;
  public ListenerMouseMove =  null;
  public ListenerMouseUp =  null;
  public ListenerkeyDown = null;

  private mouse = new THREE.Vector2();
  public highlightedObj = null;
  public highlightedIndex: number = 0;



  protected operationType: string;
  constructor() {
    this.operationType = OperationType.Base;

    this.ListenerMouseDown = this.onMouseDown.bind(this);
    this.ListenerMouseMove = this.onMouseMove.bind(this);
    this.ListenerMouseUp = this.onMouseUp.bind(this);
    this.ListenerkeyDown = this.onKeyDown.bind(this);
  }



  public Enter(): void {
    this.enter();
  }
  public Quit(): void {
    this.quit();
  }
  protected enter(): void {
    this.eventListener(true);
  }





  protected onMouseDown(event: MouseEvent) {
  }
  protected onMouseMove(event: MouseEvent) {
    //console.log(event);


    let objs = occApp.scene.objs;

    this.mouse.x = (event.offsetX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.offsetY / window.innerHeight) * 2 + 1;


    for (let mainObject of objs.values()) {
      if (mainObject) {
        occApp.scene.raycaster.raycaster.setFromCamera(this.mouse, occApp.scene.camera);
        let intersects = occApp.scene.raycaster.raycaster.intersectObjects(mainObject.mainObject.children);
        if (intersects.length > 0) {
          let isLine = intersects[0].object.type === "LineSegments";

          let intersectsObject: any = intersects[0].object;
          let newIndex = isLine ? intersectsObject.getEdgeMetadataAtLineIndex(intersects[0].index).localEdgeIndex :
            intersectsObject.geometry.attributes.color.getW(intersects[0].face.a);
          if (this.highlightedObj != intersects[0].object || this.highlightedIndex !== newIndex) {
            if (this.highlightedObj) {
              this.highlightedObj.material.color.setHex(this.highlightedObj.currentHex);
              if (this.highlightedObj && this.highlightedObj.clearHighlights) { this.highlightedObj.clearHighlights(); }
            }
            this.highlightedObj = intersects[0].object;
            this.highlightedObj.currentHex = this.highlightedObj.material.color.getHex();
            // this.highlightedObj.material.color.setHex(0xffffff);
            this.highlightedIndex = newIndex;
            if (isLine) {
              this.highlightedObj.highlightEdgeAtLineIndex(intersects[0].index);
              return;
            }
            else {
              this.highlightedObj.highlightFaceAtFaceIndex(newIndex);
              return;
            }
          }

          let indexHelper = (isLine ? "Edge" : "Face") + " Index: " + this.highlightedIndex;
          console.log(indexHelper)

        } else {
          if (this.highlightedObj) {
            this.highlightedObj.material.color.setHex(this.highlightedObj.currentHex);
            if (this.highlightedObj.clearHighlights) { this.highlightedObj.clearHighlights(); }
          }
          this.highlightedObj = null;
        }
      }

    }






  }
  protected onMouseUp(event: MouseEvent) {
  }



  protected quit(): void {
    this.eventListener(false);
  }

  public eventListener(listen: boolean) {
    if (listen) {
      occApp.scene.renderer.domElement.addEventListener('mousedown', this.ListenerMouseDown);
      occApp.scene.renderer.domElement.addEventListener('mousemove', this.ListenerMouseMove);
      occApp.scene.renderer.domElement.addEventListener('mouseup', this.ListenerMouseUp);
      document.addEventListener('keydown', this.ListenerkeyDown);
    }
    else {
      occApp.scene.renderer.domElement.removeEventListener('mousedown', this.ListenerMouseDown);
      occApp.scene.renderer.domElement.removeEventListener('mousemove', this.ListenerMouseMove);
      occApp.scene.renderer.domElement.removeEventListener('mouseup', this.ListenerMouseUp);
      document.removeEventListener('keydown', this.ListenerkeyDown);
    }
  }




  protected onKeyDown(event) {
    if (event.code === 'Escape' || event.keyCode === 27) {
      this.changeOperation();
    }
  }

  public changeOperation()
  {
    if (occApp.currentOperation.operationType != OperationType.Base)
      {
        occApp.currentOperation.Quit();
        occApp.currentOperation = occApp.Base;
        occApp.currentOperation.Enter();
      }
  }

}