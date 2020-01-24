var middlePressed = false;
var middleReleased = true;
var mouseCoords;
var mouseRotationOffset;
var previousRotationOffset;
var initialMouseRotationPosition;
var cameraRotation;
var cameraCoords;
var rotationMatrix;
var rotationMatrix2;
var translationMatrix;
var viewMatrix;
var originalViewMatrix;
var cameraDist;
var time;
var pauseTime;
var unpauseTime;
var pauseRotation;
var pickObject;
var mouseOperation;
var offsetFromObjectToMouseVector;
var originalObjectLocation;
// touch variables
var scaleStartDist;
var scaleCurrDist;
var touchOperation;
var touchCoords;
var intialCameraDist;


var InitDemo = function () {

    var monkey1Position = new Float32Array(3);
    glMatrix.vec3.set(monkey1Position, 2, 0, 0);
    var monkey1Quats = new Float32Array(4);
    glMatrix.quat.fromEuler(monkey1Quats, -90, 180, 0);

    var monkey2Position = new Float32Array(3);
    glMatrix.vec3.set(monkey2Position, -2, 0, 0);
    var monkey2Quats = new Float32Array(4);
    glMatrix.quat.fromEuler(monkey2Quats, -90, 180, 0);

    var monkey3Position = new Float32Array(3);
    glMatrix.vec3.set(monkey3Position, 0, 1.6, 0);
    var monkey3Quats = new Float32Array(4);
    glMatrix.quat.fromEuler(monkey3Quats, 90, 0, 0);

    var monkey4Position = new Float32Array(3);
    glMatrix.vec3.set(monkey4Position, 0, -1.6, 0);
    var monkey4Quats = new Float32Array(4);
    glMatrix.quat.fromEuler(monkey4Quats, -90, 180, 0);

    mouseRotationOffset = new Float32Array(2);
    initialMouseRotationPosition = new Float32Array(2);
    previousRotationOffset = new Float32Array(2);
    mouseCoords = new Int32Array(2);
    offsetFromObjectToMouseVector = new Float32Array(3);
    touchCoords = new Int32Array(2);
    cameraDist = 12;
    pauseRotation = false;
    time = 0;
    pauseTime = 0;
    unpauseTime = 0;
    pickObject = false;
    mouseOperation = -1;
    touchOperation = -1;
    startDist = 0;
    //var monkey1Position = new Float32Array(3);
    //glMatrix.vec3.set(monkey1Position, 0, 0, 0);
    //var monkey1Quats = new Float32Array(4);
    //glMatrix.quat.fromEuler(monkey1Quats, 0, 0, 0);

    Promise.all([loadTextResource('/shaders/shader.vs.glsl'), loadTextResource('/shaders/shader.fs.glsl'),
        loadTextResource('/shaders/picker-shader.vs.glsl'), loadTextResource('/shaders/picker-shader.fs.glsl')]).then((shaders) => {
        // Load models
        Promise.all([loadObjectResources('/src/monkey.json', '/src/monkey_texture.png', '/src/monkey_normal.png', monkey1Position, monkey1Quats, 1.0),
            loadObjectResources('/src/monkey.json', '/src/monkey_texture.png', '/src/monkey_normal.png', monkey2Position, monkey2Quats, 1.0),
            loadObjectResources('/src/monkey.json', '/src/monkey_texture.png', '/src/monkey_normal.png', monkey3Position, monkey3Quats, -1.0),
            loadObjectResources('/src/monkey.json', '/src/monkey_texture.png', '/src/monkey_normal.png', monkey4Position, monkey4Quats, -1.0)]).then((models) => {
            RunDemo(shaders, models);
        }).catch((reasons) => {
            console.log("Failed loading model resources");
            console.log(reasons);
        });
    }).catch((reasons) => {
        console.log("Failed loading shaders");
        console.log(reasons);
    });
}

var RunDemo = function (shaders, objectResources) {
	// Initialize WebGL
    var canvas = document.getElementById('game-surface');
    var rect = canvas.getBoundingClientRect();
    document.addEventListener('mousemove', mouseMoveHandler);
    canvas.addEventListener('mousedown', mouseDownHandler);
    document.addEventListener('mouseup', mouseUpHandler);
    canvas.addEventListener('touchstart', touchStartHandler);
    canvas.addEventListener('touchmove', touchMoveHandler);
    canvas.addEventListener('touchend', touchEndHandler);
    canvas.addEventListener('touchcancel', touchCancelHandler);
    window.addEventListener("wheel", mouseScrollHandler);
    document.addEventListener('keydown', keyPressHandler);
	var gl = canvas.getContext('webgl');

	if (!gl)
	{
		console.log('WebGL not supported, falling back on experimental-webgl');
		gl = canvas.getContext('experimental-webgl');

		if (!gl)
		{
			alert('WebGL not supported by your browser');
		}
    }

	gl.clearColor(0.65, 0.8, 0.85, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.frontFace(gl.CCW);
    gl.cullFace(gl.BACK);

	// Create shaders
	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    var pickerVertexShader = gl.createShader(gl.VERTEX_SHADER);
    var pickerFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    var vertexShaderText = shaders[0];
    var fragmentShaderText = shaders[1];
    var pickerVertexShaderText = shaders[2];
    var pickerFragmentShaderText = shaders[3];

    gl.shaderSource(vertexShader, vertexShaderText);
    gl.shaderSource(fragmentShader, fragmentShaderText);

    gl.shaderSource(pickerVertexShader, pickerVertexShaderText);
    gl.shaderSource(pickerFragmentShader, pickerFragmentShaderText);

	gl.compileShader(vertexShader);
	if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
	{
		console.error('ERROR compiling vertex shader\n', gl.getShaderInfoLog(vertexShader));
		return;
	}

	gl.compileShader(fragmentShader);
	if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
	{
		console.error('ERROR compiling framgent shader\n', gl.getShaderInfoLog(fragmentShader));
		return;
    }

    gl.compileShader(pickerVertexShader);
    if (!gl.getShaderParameter(pickerVertexShader, gl.COMPILE_STATUS)) {
        console.error('ERROR compiling picker vertex shader\n', gl.getShaderInfoLog(pickerVertexShader));
        return;
    }

    gl.compileShader(pickerFragmentShader);
    if (!gl.getShaderParameter(pickerFragmentShader, gl.COMPILE_STATUS)) {
        console.error('ERROR compiling picker framgent shader\n', gl.getShaderInfoLog(pickerFragmentShader));
        return;
    }


	// Create programs
    var pickerProgram = gl.createProgram();
    gl.attachShader(pickerProgram, pickerVertexShader);
    gl.attachShader(pickerProgram, pickerFragmentShader);
    gl.linkProgram(pickerProgram);

    if (!gl.getProgramParameter(pickerProgram, gl.LINK_STATUS)) {
        console.error('ERROR linking picker program\n', gl.getProgramInfoLog(program));
        return;
    }

    gl.validateProgram(pickerProgram);
    if (!gl.getProgramParameter(pickerProgram, gl.VALIDATE_STATUS)) {
        console.error('ERROR valdiating  picker program\n', gl.getProgramInfoLog(program));
        return;
    }

	var program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS))
	{
		console.error('ERROR linking program\n', gl.getProgramInfoLog(program));
		return;
	}
	gl.validateProgram(program);
	if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS))
	{
		console.error('ERROR valdiating program\n', gl.getProgramInfoLog(program));
		return;
    }

    var objects = [];

	// Create buffers
    for (var objectIx = 0; objectIx < objectResources.length; objectIx++) {
        var currModel = objectResources[objectIx]['model'];
        var currTexture = objectResources[objectIx]['texture'];
        var currNormal = objectResources[objectIx]['normalMap'];
        var currCoords = objectResources[objectIx]['coords'];
        var currRotation = objectResources[objectIx]['rotation'];
        var currRotationMultiplier = objectResources[objectIx]['rotationMultiplier'];

        if (!currModel || !currTexture || !currNormal || !currCoords || !currRotation) {
            console.error('Invalid model object');
            return;
        }

        var modelVertices = currModel.meshes[0].vertices;
        var modelIndices = [].concat.apply([], currModel.meshes[0].faces);
        var modelTexCoords = currModel.meshes[0].texturecoords[0];
        var modelNormals = currModel.meshes[0].normals;
        var modelTangents = currModel.meshes[0].tangents;

        var currObject = {};

        currObject.vertexBufferObject = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, currObject.vertexBufferObject);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelVertices), gl.STATIC_DRAW);

        currObject.indexBufferObject = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, currObject.indexBufferObject);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(modelIndices), gl.STATIC_DRAW);
        
        currObject.indicesCount = modelIndices.length;

        currObject.texCoordVertexBufferObject = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, currObject.texCoordVertexBufferObject);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelTexCoords), gl.STATIC_DRAW);

        currObject.normalBufferObject = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, currObject.normalBufferObject);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelNormals), gl.STATIC_DRAW);

        currObject.tangentBufferObject = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, currObject.tangentBufferObject);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(modelTangents), gl.STATIC_DRAW);

        // Create textures
        currObject.modelTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, currObject.modelTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, currTexture);
        
        currObject.modelNormalMap = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, currObject.modelNormalMap);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, currNormal);

        currObject.coords = currCoords;
        currObject.rotation = currRotation;
        currObject.rotationMultiplier = currRotationMultiplier;
        
        objects.push(currObject);

        /*
        //--- Debug Texture ---
        var basicTexture = new Uint8Array(
            [
                255, 0, 0, 255,
                0, 255, 0, 255,
                0, 0, 255, 255,
                0, 0, 0, 255,]);
	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, basicTexture);*/
    }

	gl.bindTexture(gl.TEXTURE_2D, null);

	var texSamplerLocation = gl.getUniformLocation(program, 'texSampler');
	var normSamplerLocation = gl.getUniformLocation(program, 'normSampler');
    
	// Tell OpenGL which program is active
	gl.useProgram(program);

	// Create Uniform Matrices
	var matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');
	var matViewUniformLocation = gl.getUniformLocation(program, 'mView');
    var matProjUniformLocation = gl.getUniformLocation(program, 'mProj');

    var worldMatrix = new Float32Array(16);
    var viewMatrix = new Float32Array(16);
    var projMatrix = new Float32Array(16);
    glMatrix.mat4.identity(worldMatrix);
	glMatrix.mat4.identity(viewMatrix);
    //glMatrix.mat4.identity(projMatrix);
    //glMatrix.mat4.lookAt(originalViewMatrix, [0, 0, -4.7], [0, 0, 0,], [0, 1, 0]);
    glMatrix.mat4.perspective(projMatrix, glMatrix.glMatrix.toRadian(45), canvas.width / canvas.height, 0.1, 1000.0);

    gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
	gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);
    gl.uniformMatrix4fv(matProjUniformLocation, gl.FALSE, projMatrix);

    gl.useProgram(pickerProgram);

    var pickerColorUniformLocation = gl.getUniformLocation(pickerProgram, 'fragColor');
    var pickerMatWorldUniformLocation = gl.getUniformLocation(pickerProgram, 'mWorld');
    var pickerMatViewUniformLocation = gl.getUniformLocation(pickerProgram, 'mView');
    var pickerMatProjUniformLocation = gl.getUniformLocation(pickerProgram, 'mProj');
    var pickerOffsetUniformLocation = gl.getUniformLocation(pickerProgram, 'offset')

    gl.uniformMatrix4fv(pickerMatWorldUniformLocation, gl.FALSE, worldMatrix);
    gl.uniformMatrix4fv(pickerMatViewUniformLocation, gl.FALSE, viewMatrix);
    gl.uniformMatrix4fv(pickerMatProjUniformLocation, gl.FALSE, projMatrix);

	// Create Uniforms Lighting Params
	gl.useProgram(program);

	var ambientLightIntensityUniformLocation = gl.getUniformLocation(program, 'ambientLightIntensity');
	var sunlightIntensityUniformLocation = gl.getUniformLocation(program, 'sunlightIntensity');
	var sunlightDirectionUniformLocation = gl.getUniformLocation(program, 'sunlightDirection');

	gl.uniform3f(ambientLightIntensityUniformLocation, 0.2, 0.2, 0.22);
	gl.uniform3f(sunlightIntensityUniformLocation, 0.9, 0.85, 0.8);
	gl.uniform3f(sunlightDirectionUniformLocation, -5.0, 4.0, -10.0);

    rotationMatrix = new Float32Array(16);
    rotationMatrix2 = new Float32Array(16);
    rotationMatrix2 = glMatrix.mat4.fromValues(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1);
	translationMatrix = new Float32Array(16);

	// Main render loop
	pauseTime = performance.now();
	var identityMatrix = new Float32Array(16);
    glMatrix.mat4.identity(identityMatrix);
    var invSpeed = 250;
    var angle = 0;
    var pixelData = new Uint8Array(9*4);
    var rgba = new Float64Array(4);
    rgba[3] = 1.0;
    var positionAttribLocation, texCoordAttribLocation, normalAttribLocation, tangentAttribLocation;
    var x, y, i, j, consistent;
    var pickedObjectIx, candidateObjectIx;
    var mouseWorldCoords = new Float32Array(4);
    var mouseRay = new Float32Array(4);
    var inverseProj = new Float32Array(16);
    glMatrix.mat4.invert(inverseProj, projMatrix);
    var inverseView = new Float32Array(16);
    var scalarDistFromObjectToCamera;
    var currOffsetFromObjectToMouseVector = new Float32Array(3);
    var denom, t;
    var cameraCenterRay = new Float32Array(3);
    var moved = false;
    var xRatio = rect.width/canvas.width, yRatio = rect.height/canvas.height;

    var loop = function () {
        if (!pauseRotation) {
            angle += 1;
        }

        var sinphi = Math.sin(mouseRotationOffset[1] / invSpeed);
        var cosphi = Math.cos(mouseRotationOffset[1] / invSpeed);
        var sintheta = Math.sin(-mouseRotationOffset[0] / invSpeed);
        var costheta = Math.cos(-mouseRotationOffset[0] / invSpeed);

        cameraPos = [-cameraDist * sintheta * cosphi, cameraDist * sinphi, -cameraDist * costheta * cosphi];
        glMatrix.vec3.normalize(cameraCenterRay, cameraPos);
        glMatrix.vec3.scale(cameraCenterRay, cameraCenterRay, -1);
        upVector = [0, cosphi, 0];
        glMatrix.mat4.lookAt(viewMatrix, cameraPos, [0, 0, 0,], upVector);
        glMatrix.mat4.invert(inverseView, viewMatrix);

        gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);

        gl.useProgram(pickerProgram);
        gl.uniformMatrix4fv(pickerMatViewUniformLocation, gl.FALSE, viewMatrix);
        
        gl.useProgram(program);

        // Mouse object picker logic
        if (pickObject || touchOperation == 0) {
            if (touchOperation == 0)
            {
                mouseCoords[0] = touchCoords[0];
                mouseCoords[1] = touchCoords[1];
            }

            x = parseInt((mouseCoords[0] - rect.left) / xRatio);
            y = parseInt((rect.bottom - mouseCoords[1]) / yRatio);
            pickedObjectIx = -1;
            candidateObjectIx = -1;

            if (x >= 1 && y >= 1 && x < gl.drawingBufferWidth - 1 && y < gl.drawingBufferHeight - 1) {
                gl.useProgram(pickerProgram);

                gl.clearColor(1.0, 1.0, 1.0, 1.0);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

                gl.uniform1f(pickerOffsetUniformLocation, 0.0);

                for (var objectIx = 0; objectIx < objectResources.length; objectIx++) {
                    var currObject = objects[objectIx];

                    rgba[0] = ((objectIx & 0x000000FF) >> 0) / 255.0;
                    rgba[1] = ((objectIx & 0x0000FF00) >> 8) / 255.0;
                    rgba[2] = ((objectIx & 0x00FF0000) >> 16) / 255.0;

                    if (currObject.rotationMultiplier != 0) {
                        glMatrix.quat.fromEuler(currObject.rotation, 90, 0, currObject.rotationMultiplier * angle);
                    }
                    glMatrix.mat4.fromRotationTranslation(worldMatrix, currObject.rotation, currObject.coords);
                    gl.uniformMatrix4fv(pickerMatWorldUniformLocation, gl.FALSE, worldMatrix);

                    gl.uniform4fv(pickerColorUniformLocation, rgba);

                    gl.bindBuffer(gl.ARRAY_BUFFER, currObject.vertexBufferObject);
                    positionAttribLocation = gl.getAttribLocation(pickerProgram, 'vertPosition');
                    gl.vertexAttribPointer(
                        positionAttribLocation, // Attribute Location
                        3, // Number of elements per attribute
                        gl.FLOAT, // Type of elements
                        gl.FALSE, // Whether data is normalized
                        3 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual attribute
                        0// Offset from beginning of single vertex to this attribute
                    );
                    gl.enableVertexAttribArray(positionAttribLocation);

                    gl.bindBuffer(gl.ARRAY_BUFFER, currObject.normalBufferObject);
                    normalAttribLocation = gl.getAttribLocation(pickerProgram, 'vertNormal');
                    gl.vertexAttribPointer(
                        normalAttribLocation, // Attribute Location
                        3, // Number of elements per attribute
                        gl.FLOAT, // Type of elements
                        gl.FALSE, // Whether data is normalized
                        3 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual attribute
                        0// Offset from beginning of single vertex to this attribute
                    );
                    gl.enableVertexAttribArray(normalAttribLocation);

                    gl.drawElements(gl.TRIANGLES, currObject.indicesCount, gl.UNSIGNED_SHORT, 0);
                }

                gl.flush();
                gl.finish();

                gl.readPixels(x - 1, y - 1, 3, 3, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);

                consistent = true;

                for (i = 0; i < 3; i++) {
                    for (j = 0; j < 3; j++) {
                        candidateObjectIx = pixelData[0 + i * 12 + j * 4] + (pixelData[1 + i * 12 + j * 4] * 256) + (pixelData[2 + i * 12 + j * 4] * 256 * 256);

                        if (pickedObjectIx != -1 || candidateObjectIx != pickedObjectIx) {
                            pickedObjectIx = candidateObjectIx;
                        }
                        else {
                            pickedObjectIx = -1;
                            consistent = false;
                            break;
                        }
                    }

                    if (!consistent) {
                        break;
                    }
                }

                if (pickedObjectIx >= objectResources.length) {
                    pickedObjectIx = -1;
                }

                if (touchOperation == 0)
                {
                    if (pickedObjectIx != -1) {
                        touchOperation = 1;
                        pickObject = true;
                    }
                    else {
                        initialMouseRotationPosition[0] = mouseCoords[0];
                        initialMouseRotationPosition[1] = mouseCoords[1];
                        touchOperation = 2;
                    }
                }
                
                gl.useProgram(program);
            }
        }

        // Standard rendering frame
        gl.clearColor(0.5+0.5*(Math.sin(angle / 100)), 1 - 0.5*Math.abs(Math.sin(angle / 100)), 0.85, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        var objectSelected = false;
    
        for (var objectIx = 0; objectIx < objectResources.length; objectIx++) {
            objectSelected = false;
            // We're moving this object
            if ((mouseOperation == 3 || touchOperation == 1) && objectIx == pickedObjectIx) {
                if (touchOperation == 1)
                {
                    mouseCoords[0] = touchCoords[0];
                    mouseCoords[1] = touchCoords[1];
                }

                mouseWorldCoords[0] = 2.0 *(mouseCoords[0] - rect.left) / rect.width - 1.0;
                mouseWorldCoords[1] = 2.0 *(rect.bottom - mouseCoords[1]) / rect.height - 1.0;
                mouseWorldCoords[2] = -1.0;
                mouseWorldCoords[3] = 1.0;

                glMatrix.mat4.multiply(mouseWorldCoords, inverseProj, mouseWorldCoords);
                mouseRay[0] = mouseWorldCoords[0];
                mouseRay[1] = mouseWorldCoords[1];
                mouseRay[2] = -1.0;
                mouseRay[3] = 0;

                glMatrix.mat4.multiply(mouseRay, inverseView, mouseRay);
                glMatrix.mat4.multiply(mouseWorldCoords, inverseView, mouseWorldCoords);

                mouseWorldCoords[0] = mouseWorldCoords[0] / mouseWorldCoords[3];
                mouseWorldCoords[1] = mouseWorldCoords[1] / mouseWorldCoords[3];
                mouseWorldCoords[2] = mouseWorldCoords[2] / mouseWorldCoords[3];
                mouseWorldCoords[3] = 1.0;
                glMatrix.vec4.normalize(mouseRay, mouseRay);

                if (pickObject) {
                    denom = glMatrix.vec3.dot(mouseRay, cameraCenterRay);
                    glMatrix.vec3.subtract(currOffsetFromObjectToMouseVector, objectResources[objectIx].coords, mouseWorldCoords);
                    t = glMatrix.vec3.dot(currOffsetFromObjectToMouseVector, cameraCenterRay) / denom;
                    glMatrix.vec3.scale(mouseRay, mouseRay, t);
                    glMatrix.vec3.add(offsetFromObjectToMouseVector, mouseRay, mouseWorldCoords);
                    glMatrix.vec3.subtract(offsetFromObjectToMouseVector, objectResources[objectIx].coords, offsetFromObjectToMouseVector);
                    originalObjectLocation = objectResources[objectIx].coords;
                }
                else {
                    denom = glMatrix.vec3.dot(mouseRay, cameraCenterRay);
                    glMatrix.vec3.subtract(currOffsetFromObjectToMouseVector, originalObjectLocation, mouseWorldCoords);
                    t = glMatrix.vec3.dot(currOffsetFromObjectToMouseVector, cameraCenterRay) / denom;
                    glMatrix.vec3.scale(mouseRay, mouseRay, t);
                    glMatrix.vec3.add(objectResources[objectIx].coords, mouseRay, mouseWorldCoords);
                    glMatrix.vec3.add(objectResources[objectIx].coords, offsetFromObjectToMouseVector, objectResources[objectIx].coords);
                }

                pickObject = false;
                objectSelected = true;
            }

            var currObject = objects[objectIx];

            if (currObject.rotationMultiplier != 0) {
                glMatrix.quat.fromEuler(currObject.rotation, 90, 0, currObject.rotationMultiplier * angle);
            }
            glMatrix.mat4.fromRotationTranslation(worldMatrix, currObject.rotation, currObject.coords);

            // Outline the object
            if (objectSelected) {
                gl.useProgram(pickerProgram);
                gl.cullFace(gl.FRONT);

                gl.uniform1f(pickerOffsetUniformLocation, 0.1);
                
                gl.uniformMatrix4fv(pickerMatWorldUniformLocation, gl.FALSE, worldMatrix);

                gl.bindBuffer(gl.ARRAY_BUFFER, currObject.vertexBufferObject);
                positionAttribLocation = gl.getAttribLocation(pickerProgram, 'vertPosition');
                gl.vertexAttribPointer(
                    positionAttribLocation, // Attribute Location
                    3, // Number of elements per attribute
                    gl.FLOAT, // Type of elements
                    gl.FALSE, // Whether data is normalized
                    3 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual attribute
                    0// Offset from beginning of single vertex to this attribute
                );
                gl.enableVertexAttribArray(positionAttribLocation);

                gl.bindBuffer(gl.ARRAY_BUFFER, currObject.normalBufferObject);
                normalAttribLocation = gl.getAttribLocation(pickerProgram, 'vertNormal');
                gl.vertexAttribPointer(
                    normalAttribLocation, // Attribute Location
                    3, // Number of elements per attribute
                    gl.FLOAT, // Type of elements
                    gl.TRUE, // Whether data is normalized
                    3 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual attribute
                    0 * Float32Array.BYTES_PER_ELEMENT// Offset from beginning of single vertex to this attribute
                );
                gl.enableVertexAttribArray(normalAttribLocation);
                
                rgba[0] = 1.0;
                rgba[1] = 0.8;
                rgba[2] = 0.1;
                gl.uniform4fv(pickerColorUniformLocation, rgba);
                
                gl.drawElements(gl.TRIANGLES, currObject.indicesCount, gl.UNSIGNED_SHORT, 0);

                gl.useProgram(program);
                gl.cullFace(gl.BACK);
            }

            gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, currObject.vertexBufferObject);
            positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
            gl.vertexAttribPointer(
                positionAttribLocation, // Attribute Location
                3, // Number of elements per attribute
                gl.FLOAT, // Type of elements
                gl.FALSE, // Whether data is normalized
                3 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual attribute
                0// Offset from beginning of single vertex to this attribute
            );
            gl.enableVertexAttribArray(positionAttribLocation);

            gl.bindBuffer(gl.ARRAY_BUFFER, currObject.texCoordVertexBufferObject);
            texCoordAttribLocation = gl.getAttribLocation(program, 'vertTexCoord');
            gl.vertexAttribPointer(
                texCoordAttribLocation, // Attribute Location
                2, // Number of elements per attribute
                gl.FLOAT, // Type of elements
                gl.FALSE, // Whether data is normalized
                2 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual attribute
                0 * Float32Array.BYTES_PER_ELEMENT// Offset from beginning of single vertex to this attribute
            );
            gl.enableVertexAttribArray(texCoordAttribLocation);

            gl.bindBuffer(gl.ARRAY_BUFFER, currObject.normalBufferObject);
            normalAttribLocation = gl.getAttribLocation(program, 'vertNormal');
            gl.vertexAttribPointer(
                normalAttribLocation, // Attribute Location
                3, // Number of elements per attribute
                gl.FLOAT, // Type of elements
                gl.TRUE, // Whether data is normalized
                3 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual attribute
                0 * Float32Array.BYTES_PER_ELEMENT// Offset from beginning of single vertex to this attribute
            );
            gl.enableVertexAttribArray(normalAttribLocation);

            gl.bindBuffer(gl.ARRAY_BUFFER, currObject.tangentBufferObject);
            tangentAttribLocation = gl.getAttribLocation(program, 'vertTangent');
            gl.vertexAttribPointer(
                tangentAttribLocation, // Attribute Location
                3, // Number of elements per attribute
                gl.FLOAT, // Type of elements
                gl.TRUE, // Whether data is normalized
                3 * Float32Array.BYTES_PER_ELEMENT, // Size of an individual attribute
                0 * Float32Array.BYTES_PER_ELEMENT// Offset from beginning of single vertex to this attribute
            );
            gl.enableVertexAttribArray(tangentAttribLocation);

            gl.activeTexture(gl.TEXTURE0);
            gl.uniform1i(texSamplerLocation, 0);
            gl.bindTexture(gl.TEXTURE_2D, currObject.modelTexture);

            gl.activeTexture(gl.TEXTURE1);
            gl.uniform1i(normSamplerLocation, 1);
            gl.bindTexture(gl.TEXTURE_2D, currObject.modelNormalMap);

            gl.drawElements(gl.TRIANGLES, currObject.indicesCount, gl.UNSIGNED_SHORT, 0);
        }
		requestAnimationFrame(loop);
	};
	requestAnimationFrame(loop);
};

var logMat4 = function(mat)
{
	for (var i = 0; i < 4; i++)
	{
		var chunk = mat.slice(i*4, i*4+4);
		console.log(chunk);
	}
}

function mouseMoveHandler(e) {
    if (!middleReleased) {
        mouseRotationOffset[0] = e.pageX - initialMouseRotationPosition[0] + previousRotationOffset[0];
        mouseRotationOffset[1] = e.pageY - initialMouseRotationPosition[1] + previousRotationOffset[1];
    }

    mouseCoords[0] = e.pageX;
    mouseCoords[1] = e.pageY;
}

function mouseDownHandler(e) {
    if (mouseOperation == -1) {
        //console.log("Down", e.which);
        if (e.which == 2) {
            mouseOperation = e.which;
            middlePressed = true;
            middleReleased = false;
            initialMouseRotationPosition[0] = e.pageX;
            initialMouseRotationPosition[1] = e.pageY;
            return false;
        }
        else if (e.which == 3) {
            mouseOperation = e.which;
            pickObject = true;
        }
    }
}

function mouseUpHandler(e) {
    if (e.which == mouseOperation) {
        //console.log("Up", e.which);
        if (e.which == 2) {
            middlePressed = false;
            middleReleased = true;
            previousRotationOffset[0] = mouseRotationOffset[0];
            previousRotationOffset[1] = mouseRotationOffset[1];
        }
        else if (e.which == 3) {
            pickedObjectIx = -1;
        }

        mouseOperation = -1;
    }
}

function mouseScrollHandler(e) {
    const delta = Math.sign(event.deltaY);
    cameraDist += delta * 0.5;
    if (cameraDist < 0.5) {
        cameraDist = 0.5;
    }
}

function keyPressHandler(e) {
    //console.log(e.keyCode);
    if (e.keyCode == 32) {
        pauseRotation = !pauseRotation;
    }
}

function touchStartHandler(e) {
    e.preventDefault();
    switch (e.touches.length) {
        case 1:
            handleOneTouch(e);
            break;
        case 2:
            handleTwoTouch(e);
            break;
        default:
            touchOperation = 0;
    }
}

function handleOneTouch(e) {
    touchOperation = 0;
    touchCoords[0] = e.touches[0].pageX;
    touchCoords[1] = e.touches[0].pageY;
}

function handleTwoTouch(e) {
    scaleStartDist = Math.sqrt(Math.pow(e.touches[0].pageX - e.touches[1].pageX, 2) + Math.pow(e.touches[0].pageY - e.touches[1].pageY, 2));
    intialCameraDist = cameraDist;
    touchOperation = 3;
}

function touchMoveHandler(e) {
    switch (touchOperation) {
        case 1:
            if (e.touches.length != 1){
                console.error("Touch move event", touchOperation, "with more touches than expected", e.touches.length);
                touchOperation = -1;
                break;
            }
            touchCoords[0] = e.touches[0].pageX;
            touchCoords[1] = e.touches[0].pageY;
            break;
        case 2:
            if (e.touches.length != 1){
                console.error("Touch move event", touchOperation, "with more touches than expected", e.touches.length);
                touchOperation = -1;
                break;
            }
            mouseRotationOffset[0] = e.touches[0].pageX - initialMouseRotationPosition[0] + previousRotationOffset[0];
            mouseRotationOffset[1] = e.touches[0].pageY - initialMouseRotationPosition[1] + previousRotationOffset[1];
            break;
        case 3:
            if (e.touches.length != 2){
                console.error("Touch move event", touchOperation, "with more touches than expected", e.touches.length);
                touchOperation = -1;
                break;
            }
            scaleCurrDist = Math.sqrt(Math.pow(e.touches[0].pageX - e.touches[1].pageX, 2) + Math.pow(e.touches[0].pageY - e.touches[1].pageY, 2));
            cameraDist = intialCameraDist + 0.1 *(scaleStartDist - scaleCurrDist);
            if (cameraDist < 0.5) {
                cameraDist = 0.5;
            }
            break;
    }
}

function touchEndHandler(e) {
    console.log("Touch end", touchOperation);
    switch (touchOperation) {
        case 2:
            previousRotationOffset[0] = mouseRotationOffset[0];
            previousRotationOffset[1] = mouseRotationOffset[1];
            break;
    }
    touchOperation = -1;
}

function touchCancelHandler(e) {
    console.log("Touch cancel", touchOperation);
    switch (touchOperation) {
        case 2:
            previousRotationOffset[0] = mouseRotationOffset[0];
            previousRotationOffset[1] = mouseRotationOffset[1];
            break;
    }
    touchOperation = -1;
}