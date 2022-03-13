
import { occApp } from "./occApp";
import initOpenCascade from "opencascade.js";
import { OperationType } from "./Operation/OperationType";





let app = new occApp();

init();



function init() {
    initOpenCascade().then(oc => {
        occApp.oc = oc;
        document.getElementById('loading').style.display = 'none';
    });

    document.getElementById("fileInput").addEventListener('input', async (event) => {
        let srcElement: any = event.srcElement;
        occApp.loadFiles(srcElement.files);
    });
    for (let type in OperationType) {
        let element = document.getElementById(type);
        if (element) {
            element.onclick = function () {occApp.runCommand(type); }
        }

    }
}