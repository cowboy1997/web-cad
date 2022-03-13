import * as THREE from "three"

export class ThreeRaycaster {
    private _camera : THREE.Camera;
    public raycaster :THREE.Raycaster
    private _mouse = new THREE.Vector2();

    constructor( camera:THREE.Camera) {

        this.raycaster = new THREE.Raycaster();
        this._mouse = new THREE.Vector2();

        this._camera = camera;
	}
    public getIntersect(event):THREE.Vector3
    {
        this._mouse.x = (event.offsetX / window.innerWidth) * 2 - 1;
        this._mouse.y = -(event.offsetY / window.innerHeight) * 2 + 1;
        let normal = new THREE.Vector3(0, 0, 1);
        /* 创建平面 */
        let planeGround = new THREE.Plane(normal, 0);
        /* 从相机发出一条射线经过鼠标点击的位置 */
        this.raycaster.setFromCamera(this._mouse, this._camera);
        /* 获取射线 */
        let ray = this.raycaster.ray;
        /* 计算交点 */
        let intersects  = new THREE.Vector3(0, 0, 0);
        ray.intersectPlane(planeGround,intersects);
        /* 返回向量 */
        return intersects;
    }
}
