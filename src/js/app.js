// Your code goes here

var previousSpeed = 0; //0=parked, 1-2=driving
gm.system.watchSpeed(watchSpeedCallback);
var dataListener; // id of vehicle data process

var brakePositionData = [];
var acceleratorPositionData = [];
var wheelAngleData = [];

var lastBrake;
var lastAccelerator;
var lastWheelAngle;

function watchSpeedCallback(speed) {
  if (speed == 0 && previousSpeed > 0) {
    //stop the drive
    previousSpeed = speed;
    stopDrive();
  } else if (previousSpeed == 0 && speed > 0) {
    //start the drive
    previousSpeed = speed;
    startDrive();
  }
}

function startDrive() {
  //update the UI to show we're in driving mode
  //start watching for data
  // TODO: consider backing up existing data
  brakePositionData = [];
  acceleratorPositionData = [];
  wheelAngleData = [];
  console.log('starting drive');
  dataListener = gm.info.watchVehicleData(processData,processDataError,['brake_position','accelerator_position','wheel_angle'],100);
}

function processData(data) {
  console.log('got vehicle data: ', data);
  if (data.brake_position) {
    lastBrake = data.brake_position;
    brakePositionData.push(lastBrake);
  } else if (lastBrake) {
    brakePositionData.push(lastBrake);
  } else {
    brakePositionData.push(0);
  }
  if (data.accelerator_position) {
    lastAccelerator = data.accelerator_position;
    acceleratorPositionData.push(lastAccelerator);
  } else if (lastAccelerator) {
    acceleratorPositionData.push(lastAccelerator);
  } else {
    acceleratorPositionData.push(0);
  }
  if (data.wheel_angle) {
    lastWheelAngle = data.wheel_angle;
    wheelAngleData.push(lastWheelAngle);
  } else if (lastWheelAngle) {
    wheelAngleData.push(lastWheelAngle);
  } else {
    wheelAngleData.push(0);
  }
}

function processDataError() {
  //TODO: display an error
}

function stopDrive() {
  //stop watching for data
  //send driving data to server, await response
  console.log('stopping drive');
  console.log('brake array: ', brakePositionData);
  console.log('acceleration array', acceleratorPositionData);
  console.log('wheel angle array', wheelAngleData);
  gm.info.clearVehicleData(dataListener);
  var wcc = new WolframCloudCall();
  console.log("sending data to wolfram");
  var seconds = new Date() / 1000; //seconds since epoch
  wcc.call(acceleratorPositionData, brakePositionData, wheelAngleData, seconds, function(result) {
    console.log("data sent");
    console.log(result);
    wcc.callFollowup(function(result) {
      console.log("followup sent");
      console.log(result);
    });
  });
}

/*
JavaScript EmbedCode usage:

var wcc = new WolframCloudCall();
wcc.call(accInt, brakeInt, steeringAngle, ID, function(result) { console.log(result); });
*/

var WolframCloudCall;

(function() {
WolframCloudCall = function() {	this.init(); };

var p = WolframCloudCall.prototype;

p.init = function() {};

p._createCORSRequest = function(method, url) {
	var xhr = new XMLHttpRequest();
	if ("withCredentials" in xhr) {
		xhr.open(method, url, true);
	} else if (typeof XDomainRequest != "undefined") {
		xhr = new XDomainRequest();
		xhr.open(method, url);
	} else {
		xhr = null;
	}
	return xhr;
};

p._encodeArgs = function(args) {
	var argName;
	var params = "";
	for (argName in args) {
		params += (params == "" ? "" : "&");
		params += encodeURIComponent(argName) + "=" + encodeURIComponent(args[argName]);
	}
	return params;
};

p._auxCall = function(url, args, callback) {
	var params = this._encodeArgs(args);
	var xhr = this._createCORSRequest("post", url);
	if (xhr) {
		xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		xhr.setRequestHeader("EmbedCode-User-Agent", "EmbedCode-JavaScript/1.0");
		xhr.onload = function() {
			if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {
				callback(xhr.responseText);
			} else {
				callback(null);
			}
		};
		xhr.send(params);
	} else {
		throw new Error("Could not create request object.");
	}
};

p.call = function(accInt, brakeInt, steeringAngle, identifier, callback) {
	var url = "http://www.wolframcloud.com/objects/899b186a-0734-4fea-892a-6b85d029aeb9";
	var args = {accInt: accInt, brakeInt: brakeInt, steeringAngle: steeringAngle, identifier: identifier};
	var callbackWrapper = function(result) {
		if (result === null) callback(null);
		else callback(result);
	};
	this._auxCall(url, args, callbackWrapper);
};

p.callFollowup = function(callback) {
  var url = "http://www.wolframcloud.com/objects/49255d03-988d-423c-8aee-5ef57afa02d9";
  var args = {};
  var callbackWrapper = function(result) {
    if (result === null) callback(null);
    else callback(result);
  };
  this._auxCall(url, args, callbackWrapper);
};
})();
