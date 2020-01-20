// Load a text resource from a file over the network
var loadTextResource = function(url)
{
    return new Promise(function(resolve, reject) {
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.onload = function () {
            if (request.status < 200 || request.status > 299) {
                reject(Error('HTTP Status ' + request.status + ' on resource ' + url));
            }
            else {
                resolve(request.responseText);
            }
        };

        request.onerror = function()
        {
            reject(Error('Network error on resource ' + url));
        }

        request.send();
    });
};

var loadImage = function(url)
{
    return new Promise(function (resolve, reject) {
        var image = new Image();
        image.addEventListener('load', function () {
            resolve(image);
        });
        image.addEventListener('error', function () {
            reject(Error('Network error on image ' + url));
        });
        image.src = url;
    });
}

var loadJSONResource = function(url)
{
    return new Promise(function (resolve, reject) {
        loadTextResource(url).then((response) => {
            try {
                resolve(JSON.parse(response));
            }
            catch (e) {
                reject(e);
            }
        }).catch((error) => {
            reject(error);
        });
    });
}

var loadObjectResources = function (modelName, textureName, normalName, objectCoordinates, objectRotation, objectRotationMultiplier) {
    return new Promise(function (resolve, reject) {
        Promise.all([
        loadJSONResource(modelName),
        loadImage(textureName),
        loadImage(normalName)]).then((resources) => {
            resolve({
                model: resources[0],
                texture: resources[1],
                normalMap: resources[2],
                coords: objectCoordinates,
                rotation: objectRotation,
                rotationMultiplier: objectRotationMultiplier})
        }).catch((reason) => {
            reject(reason)
        });
    });
}