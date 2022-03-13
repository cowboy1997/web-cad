import { TopoDS_Shape } from "opencascade.js/dist/opencascade.full";
import * as THREE from "three"
import { occApp } from "./occApp";


export class faceData {
    vertex_coord: number[] = [];
    uv_coord: number[] = [];
    normal_coord: number[] = [];
    tri_indexes: number[] = [];
    number_of_triangles: number = 0;
    face_index: number = 0;
}


export class edgeData {
    vertex_coord: number[] = [];
    edge_index: number = 0;
}

export class faceMetadata {
    localFaceIndex: number = 0;
    start: number = 0;
    end: number = 0;
}


export class occShape {

    private static _modelMaterial: THREE.MeshPhongMaterial = null;
    /**
     * 模型材质
     */
    public static get modelMaterial(): THREE.MeshPhongMaterial {
        if (this._modelMaterial == null) {
            let loader = new THREE.TextureLoader();
            loader.setCrossOrigin('');
            let matcap = loader.load('./textures/dullFrontLitMetal.png');
            let m: any = new THREE.MeshMatcapMaterial({
                // color: new THREE.Color(0xf5f5f5),
                vertexColors: true,
                matcap: matcap,
                polygonOffset: true, // Push the mesh back for line drawing
                polygonOffsetFactor: 2.0,
                polygonOffsetUnits: 1.0
            });
            this._modelMaterial = m;

        }
        return this._modelMaterial;
    }


    private static _lineMaterial: THREE.LineBasicMaterial = null;
    public static get lineMaterial(): THREE.LineBasicMaterial {
        if (this._modelMaterial == null) {
            this._lineMaterial = new THREE.LineBasicMaterial({
                color: 0xffffff, linewidth: 1.5, vertexColors: true
            });

        }
        return this._lineMaterial;
    }



    public topoShape: TopoDS_Shape;

    public mainObject: THREE.Group = new THREE.Group();


    public addTopoShapeToSence(topoShape: TopoDS_Shape) {

        let MeshData = occShape.ShapeToMesh(topoShape);
        this.topoShape = topoShape;
        let facelist = MeshData.face;
        let edgelist = MeshData.edge;
        // Add Triangulated Faces to Object

        if (facelist && facelist.length > 0) {
            let vertices = [], normals = [], triangles = [], uvs = [], colors = []; let vInd = 0; let globalFaceIndex = 0;
            let globalFaceMetadata = {}; globalFaceMetadata[-1] = { start: -1, end: -1 };
            facelist.forEach((face) => {
                // Copy Vertices into three.js Vector3 List
                vertices.push(...face.vertex_coord);
                normals.push(...face.normal_coord);
                uvs.push(...face.uv_coord);

                // Sort Triangles into a three.js Face List
                for (let i = 0; i < face.tri_indexes.length; i += 3) {
                    triangles.push(
                        face.tri_indexes[i + 0] + vInd,
                        face.tri_indexes[i + 1] + vInd,
                        face.tri_indexes[i + 2] + vInd);
                }

                let metadata: faceMetadata = new faceMetadata();
                metadata.localFaceIndex = face.face_index;
                metadata.start = colors.length;
                // Use Vertex Color to label this face's indices for raycast picking
                for (let i = 0; i < face.vertex_coord.length; i += 3) {
                    //colors.push(face.face_index, globalFaceIndex, 0,5);
                    colors.push(1, 1, 1, globalFaceIndex);
                }
                metadata.end = colors.length;
                globalFaceMetadata[globalFaceIndex] = metadata;
                globalFaceIndex++;
                vInd += face.vertex_coord.length / 3;
            });
            // Compile the connected vertices and faces into a model
            // And add to the scene
            let geometry = new THREE.BufferGeometry();
            geometry.setIndex(triangles);
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            geometry.setAttribute('uv2', new THREE.Float32BufferAttribute(uvs, 2));
            geometry.computeBoundingSphere();
            geometry.computeBoundingBox();
            let model: any = new THREE.Mesh(geometry, occShape.modelMaterial);
            model.castShadow = true;
            model.name = "Model Faces";
            model.faceColors = colors;
            model.globalFaceMetadata = globalFaceMetadata;
            model.highlightFaceAtFaceIndex = function (index) {
                let startIndex = this.globalFaceMetadata[index].start;
                let endIndex = this.globalFaceMetadata[index].end;
                for (let i = 0; i < this.faceColors.length / 4; i++) {
                    let colIndex = 4 * i;
                    this.faceColors[colIndex] = (colIndex >= startIndex && colIndex <= endIndex) ? 1 : 1;
                    colIndex = 4 * i + 1;
                    this.faceColors[colIndex] = (colIndex >= startIndex && colIndex <= endIndex) ? 1 : 1;
                    colIndex = 4 * i + 2;
                    this.faceColors[colIndex] = (colIndex >= startIndex && colIndex <= endIndex) ? 0 : 1;
                }
                this.geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.faceColors, 4));
                this.geometry.colorsNeedUpdate = true;
            }.bind(model);
            model.clearHighlights = function () {
                return this.highlightFaceAtFaceIndex(-1);
            }.bind(model);

            this.mainObject.add(model);

        }


        if (edgelist && edgelist.length > 0) {
            let lineVertices = []; let globalEdgeIndices = [];
            let curGlobalEdgeIndex = 0; let edgeVertices = 0;
            let globalEdgeMetadata = {}; globalEdgeMetadata[-1] = { start: -1, end: -1 };
            edgelist.forEach((edge) => {
                let edgeMetadata: any = {};
                edgeMetadata.localEdgeIndex = edge.edge_index;
                edgeMetadata.start = globalEdgeIndices.length;
                for (let i = 0; i < edge.vertex_coord.length - 3; i += 3) {
                    lineVertices.push(new THREE.Vector3(edge.vertex_coord[i],
                        edge.vertex_coord[i + 1],
                        edge.vertex_coord[i + 2]));

                    lineVertices.push(new THREE.Vector3(edge.vertex_coord[i + 3],
                        edge.vertex_coord[i + 1 + 3],
                        edge.vertex_coord[i + 2 + 3]));
                    globalEdgeIndices.push(curGlobalEdgeIndex); globalEdgeIndices.push(curGlobalEdgeIndex);
                    edgeVertices++;
                }
                edgeMetadata.end = globalEdgeIndices.length - 1;
                globalEdgeMetadata[curGlobalEdgeIndex] = edgeMetadata;
                curGlobalEdgeIndex++;
            });

            let lineGeometry = new THREE.BufferGeometry().setFromPoints(lineVertices);
            let lineColors = []; for (let i = 0; i < lineVertices.length; i++) { lineColors.push(0, 0, 0); }
            lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
            let line: any = new THREE.LineSegments(lineGeometry, occShape.lineMaterial);
            line.globalEdgeIndices = globalEdgeIndices;
            line.name = "Model Edges";
            line.lineColors = lineColors;
            line.globalEdgeMetadata = globalEdgeMetadata;
            line.highlightEdgeAtLineIndex = function (lineIndex) {
                let edgeIndex = lineIndex >= 0 ? this.globalEdgeIndices[lineIndex] : lineIndex;
                let startIndex = this.globalEdgeMetadata[edgeIndex].start;
                let endIndex = this.globalEdgeMetadata[edgeIndex].end;
                for (let i = 0; i < this.lineColors.length; i++) {
                    let colIndex = Math.floor(i / 3);
                    this.lineColors[i] = (colIndex >= startIndex && colIndex <= endIndex) ? 1 : 0;
                }
                this.geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.lineColors, 3));
                this.geometry.colorsNeedUpdate = true;
            }.bind(line);
            line.getEdgeMetadataAtLineIndex = function (lineIndex) {
                return this.globalEdgeMetadata[this.globalEdgeIndices[lineIndex]];
            }.bind(line);
            line.clearHighlights = function () {
                return this.highlightEdgeAtLineIndex(-1);
            }.bind(line);
            this.mainObject.add(line);
        }
        let topoHash = topoShape.HashCode(100000000);
        occApp.scene.objs.set(topoHash, this);
        occApp.scene.scene.add(this.mainObject);
    }

    public addCurveToSence(topoShape: TopoDS_Shape) {

    }





    public static ShapeToMesh(shape: TopoDS_Shape, maxDeviation = 0.1) {
        let oc = occApp.oc;
        let facelist: faceData[] = [], edgeList: edgeData[] = [];

        let fullShapeEdgeHashes = {}; let fullShapeFaceHashes = {};
        function ForEachEdge(shape, callback) {
            let edgeHashes = {};
            let edgeIndex = 0;
            let anExplorer = new oc.TopExp_Explorer_2(shape, oc.TopAbs_ShapeEnum.TopAbs_EDGE as any, oc.TopAbs_ShapeEnum.TopAbs_SHAPE as any);
            for (; anExplorer.More(); anExplorer.Next()) {
                let edge = oc.TopoDS.Edge_1(anExplorer.Current());
                let edgeHash = edge.HashCode(100000000);
                if (!edgeHashes.hasOwnProperty(edgeHash)) {
                    edgeHashes[edgeHash] = edgeIndex;
                    callback(edgeIndex++, edge);
                }
            }
            return edgeHashes;
        }
        function ForEachFace(shape, callback) {
            let face_index = 0;
            let anExplorer = new oc.TopExp_Explorer_2(shape, oc.TopAbs_ShapeEnum.TopAbs_FACE as any, oc.TopAbs_ShapeEnum.TopAbs_SHAPE as any);
            for (; anExplorer.More(); anExplorer.Next()) {
                callback(face_index++, oc.TopoDS.Face_1(anExplorer.Current()));
            }
        }
        Object.assign(fullShapeEdgeHashes, ForEachEdge(shape, (index, edge) => { }));
        ForEachFace(shape, (index, face) => {
            fullShapeFaceHashes[face.HashCode(100000000)] = index;
        });

        let fullShapeEdgeHashes2 = {};
        let triangulations = []; let uv_boxes = []; let curFace = 0;
        new oc.BRepMesh_IncrementalMesh_2(shape, maxDeviation, false, maxDeviation * 5, false);
        const aFaceExplorer = new oc.TopExp_Explorer_2(shape, oc.TopAbs_ShapeEnum.TopAbs_FACE as any, oc.TopAbs_ShapeEnum.TopAbs_SHAPE as any);
        for (; aFaceExplorer.More(); aFaceExplorer.Next()) {
            const myFace = oc.TopoDS.Face_1(aFaceExplorer.Current());
            let aLocation = new oc.TopLoc_Location_1();
            let myT = oc.BRep_Tool.Triangulation(myFace, aLocation);
            if (myT.IsNull()) {
                console.error("Encountered Null Face!");
                continue;
            }

            let this_face: faceData = {
                vertex_coord: [],
                uv_coord: [],
                normal_coord: [],
                tri_indexes: [],
                number_of_triangles: 0,
                face_index: fullShapeFaceHashes[myFace.HashCode(100000000)]
            };

            let pc = new oc.Poly_Connect_2(myT);
            let Nodes = myT.get().Nodes();

            // Write vertex buffer
            this_face.vertex_coord = new Array(Nodes.Length() * 3);
            for (let i = 0; i < Nodes.Length(); i++) {
                let p = Nodes.Value(i + 1).Transformed(aLocation.Transformation());
                this_face.vertex_coord[(i * 3) + 0] = p.X();
                this_face.vertex_coord[(i * 3) + 1] = p.Y();
                this_face.vertex_coord[(i * 3) + 2] = p.Z();
            }

            // Write UV buffer
            let orient = myFace.Orientation_1();


            if (myT.get().HasUVNodes()) {
                // Get UV Bounds
                let UMin = 0, UMax = 0, VMin = 0, VMax = 0;

                let UVNodes = myT.get().UVNodes(), UVNodesLength = UVNodes.Length();
                this_face.uv_coord = new Array(UVNodesLength * 2);
                for (let i = 0; i < UVNodesLength; i++) {
                    let p = UVNodes.Value(i + 1);
                    let x = p.X(), y = p.Y();
                    this_face.uv_coord[(i * 2) + 0] = x;
                    this_face.uv_coord[(i * 2) + 1] = y;

                    // Compute UV Bounds
                    if (i == 0) { UMin = x; UMax = x; VMin = y; VMax = y; }
                    if (x < UMin) { UMin = x; } else if (x > UMax) { UMax = x; }
                    if (y < VMin) { VMin = y; } else if (y > VMax) { VMax = y; }
                }

                // Compute the Arclengths of the Isoparametric Curves of the face
                let surface = oc.BRep_Tool.Surface_2(myFace).get();
                let UIso_Handle = surface.UIso(UMin + ((UMax - UMin) * 0.5));
                let VIso_Handle = surface.VIso(VMin + ((VMax - VMin) * 0.5));
                let UAdaptor = new oc.GeomAdaptor_Curve_2(VIso_Handle);
                let VAdaptor = new oc.GeomAdaptor_Curve_2(UIso_Handle);
                uv_boxes.push({
                    w: this.LengthOfCurve(UAdaptor, UMin, UMax),
                    h: this.LengthOfCurve(VAdaptor, VMin, VMax),
                    index: curFace
                });

                // Normalize each face's UVs to 0-1
                for (let i = 0; i < UVNodesLength; i++) {
                    let x = this_face.uv_coord[(i * 2) + 0],
                        y = this_face.uv_coord[(i * 2) + 1];

                    x = ((x - UMin) / (UMax - UMin));
                    y = ((y - VMin) / (VMax - VMin));
                    if (orient !== oc.TopAbs_Orientation.TopAbs_FORWARD) { x = 1.0 - x; }

                    this_face.uv_coord[(i * 2) + 0] = x;
                    this_face.uv_coord[(i * 2) + 1] = y;
                }
            }

            // Write normal buffer
            let myNormal = new oc.TColgp_Array1OfDir_2(Nodes.Lower(), Nodes.Upper());
            oc.StdPrs_ToolTriangulatedShape.Normal(myFace, pc, myNormal);
            this_face.normal_coord = new Array(myNormal.Length() * 3);
            for (let i = 0; i < myNormal.Length(); i++) {
                let d = myNormal.Value(i + 1).Transformed(aLocation.Transformation());
                this_face.normal_coord[(i * 3) + 0] = d.X();
                this_face.normal_coord[(i * 3) + 1] = d.Y();
                this_face.normal_coord[(i * 3) + 2] = d.Z();
            }

            // Write triangle buffer
            let triangles = myT.get().Triangles();
            this_face.tri_indexes = new Array(triangles.Length() * 3);
            let validFaceTriCount = 0;
            for (let nt = 1; nt <= myT.get().NbTriangles(); nt++) {
                let t = triangles.Value(nt);
                let n1 = t.Value(1);
                let n2 = t.Value(2);
                let n3 = t.Value(3);
                if (orient !== oc.TopAbs_Orientation.TopAbs_FORWARD) {
                    let tmp = n1;
                    n1 = n2;
                    n2 = tmp;
                }
                // if(TriangleIsValid(Nodes.Value(1), Nodes.Value(n2), Nodes.Value(n3))) {
                this_face.tri_indexes[(validFaceTriCount * 3) + 0] = n1 - 1;
                this_face.tri_indexes[(validFaceTriCount * 3) + 1] = n2 - 1;
                this_face.tri_indexes[(validFaceTriCount * 3) + 2] = n3 - 1;
                validFaceTriCount++;
                // }
            }
            this_face.number_of_triangles = validFaceTriCount;
            facelist.push(this_face);
            curFace += 1;

            const aEdgeExplorer = new oc.TopExp_Explorer_2(myFace, oc.TopAbs_ShapeEnum.TopAbs_EDGE as any, oc.TopAbs_ShapeEnum.TopAbs_SHAPE as any);
            for (; aEdgeExplorer.More(); aEdgeExplorer.Next()) {
                let myEdge = oc.TopoDS.Edge_1(aEdgeExplorer.Current());
                let edgeHash = myEdge.HashCode(100000000);
                if (fullShapeEdgeHashes2.hasOwnProperty(edgeHash)) {
                    let this_edge: edgeData = {
                        vertex_coord: [],
                        edge_index: -1
                    };

                    let myP = oc.BRep_Tool.PolygonOnTriangulation_1(myEdge, myT, aLocation);
                    let edgeNodes = myP.get().Nodes();

                    // write vertex buffer
                    this_edge.vertex_coord = new Array(edgeNodes.Length() * 3);
                    for (let j = 0; j < edgeNodes.Length(); j++) {
                        let vertexIndex = edgeNodes.Value(j + 1);
                        this_edge.vertex_coord[(j * 3) + 0] = this_face.vertex_coord[((vertexIndex - 1) * 3) + 0];
                        this_edge.vertex_coord[(j * 3) + 1] = this_face.vertex_coord[((vertexIndex - 1) * 3) + 1];
                        this_edge.vertex_coord[(j * 3) + 2] = this_face.vertex_coord[((vertexIndex - 1) * 3) + 2];
                    }

                    this_edge.edge_index = fullShapeEdgeHashes[edgeHash];

                    edgeList.push(this_edge);
                } else {
                    fullShapeEdgeHashes2[edgeHash] = edgeHash;
                }


            }
            triangulations.push(myT);
        }

        // Scale each face's UVs to Worldspace and pack them into a 0-1 Atlas with potpack
        // let padding = 2;
        // for (let f = 0; f < uv_boxes.length; f++) { uv_boxes[f].w += padding; uv_boxes[f].h += padding; }
        // let packing_stats = potpack(uv_boxes);
        // for (let f = 0; f < uv_boxes.length; f++) {
        //     let box = uv_boxes[f];
        //     let this_face = facelist[box.index];
        //     for (let q = 0; q < this_face.uv_coord.length / 2; q++) {
        //         let x = this_face.uv_coord[(q * 2) + 0],
        //             y = this_face.uv_coord[(q * 2) + 1];

        //         x = ((x * (box.w - padding)) + (box.x + (padding * 0.5))) / Math.max(packing_stats.w, packing_stats.h);
        //         y = ((y * (box.h - padding)) + (box.y + (padding * 0.5))) / Math.max(packing_stats.w, packing_stats.h);

        //         this_face.uv_coord[(q * 2) + 0] = x;
        //         this_face.uv_coord[(q * 2) + 1] = y;

        //         //Visualize Packed UVs
        //         //this_face.vertex_coord[(q * 3) + 0] = x * 100.0;
        //         //this_face.vertex_coord[(q * 3) + 1] = y * 100.0;
        //         //this_face.vertex_coord[(q * 3) + 2] = 0.0;
        //     }
        // }

        // Nullify Triangulations between runs so they're not stored in the cache
        for (let i = 0; i < triangulations.length; i++) { triangulations[i].Nullify(); }


        const aEdgeExplorer = new oc.TopExp_Explorer_2(shape, oc.TopAbs_ShapeEnum.TopAbs_EDGE as any, oc.TopAbs_ShapeEnum.TopAbs_SHAPE as any);
        for (; aEdgeExplorer.More(); aEdgeExplorer.Next()) {
            let myEdge = oc.TopoDS.Edge_1(aEdgeExplorer.Current());
            let edgeHash = myEdge.HashCode(100000000);
            if (!fullShapeEdgeHashes2.hasOwnProperty(edgeHash)) {
                let this_edge = {
                    vertex_coord: [],
                    edge_index: -1
                };
                let aLocation = new oc.TopLoc_Location_1();
                let adaptorCurve = new oc.BRepAdaptor_Curve_2(myEdge);
                let tangDef = new oc.GCPnts_TangentialDeflection_2(adaptorCurve, maxDeviation, 0.1, 2, 1.0e-9, 1.0e-7);
                // write vertex buffer
                this_edge.vertex_coord = new Array(tangDef.NbPoints() * 3);
                for (let j = 0; j < tangDef.NbPoints(); j++) {
                    let vertex = tangDef.Value(j + 1).Transformed(aLocation.Transformation());
                    this_edge.vertex_coord[(j * 3) + 0] = vertex.X();
                    this_edge.vertex_coord[(j * 3) + 1] = vertex.Y();
                    this_edge.vertex_coord[(j * 3) + 2] = vertex.Z();
                }
                this_edge.edge_index = fullShapeEdgeHashes[edgeHash];
                fullShapeEdgeHashes2[edgeHash] = edgeHash;

                edgeList.push(this_edge);
            }
        }
        return { face: facelist, edge: edgeList };
    }






    public static LengthOfCurve(geomAdaptor, UMin, UMax, segments = 5) {
        let point1 = new THREE.Vector3(), point2 = new THREE.Vector3(), arcLength = 0, gpPnt = new occApp.oc.gp_Pnt_1();
        for (let s = UMin; s <= UMax; s += (UMax - UMin) / segments) {
            geomAdaptor.D0(s, gpPnt);
            point1.set(gpPnt.X(), gpPnt.Y(), gpPnt.Z());
            if (s == UMin) {
                point2.copy(point1);
            } else {
                arcLength += point1.distanceTo(point2);
            }
            point2.copy(point1);
        }
        return arcLength;
    }


    public static edgeOfVector3(shape: TopoDS_Shape, maxDeviation = 0.1):THREE.Vector3[]
     {
        let oc = occApp.oc;
        let vec3s:THREE.Vector3[]=[];
        const aEdgeExplorer = new oc.TopExp_Explorer_2(shape, oc.TopAbs_ShapeEnum.TopAbs_EDGE as any, oc.TopAbs_ShapeEnum.TopAbs_SHAPE as any);
        for (; aEdgeExplorer.More(); aEdgeExplorer.Next()) {
            let myEdge = oc.TopoDS.Edge_1(aEdgeExplorer.Current());
            let aLocation = new oc.TopLoc_Location_1();
            let adaptorCurve = new oc.BRepAdaptor_Curve_2(myEdge);
            let tangDef = new oc.GCPnts_TangentialDeflection_2(adaptorCurve, maxDeviation, 0.1, 2, 1.0e-9, 1.0e-7);
            // write vertex buffer
            for (let j = 0; j < tangDef.NbPoints(); j++) {
                let vertex = tangDef.Value(j + 1).Transformed(aLocation.Transformation());     

                if(vec3s.length>1)
                {
                    vec3s.push(vec3s[vec3s.length-1]);
                }
                let v=new THREE.Vector3(vertex.X(),vertex.Y(),vertex.Z());
                vec3s.push(v);
            }
        }
        return vec3s
    }

}