var Q_table = {};
var actionSet = {
  STAY : 0,
  JUMP : 1
};

var gamma = 0.8; // Discounted rewards
var alpha = 0.1; // Learning rate
var epsilon = 0.1; // Exploration rate
var frameBuffer = [];
var episodeFrameCount = 0;
var targetTubeIndex;
var targetTube;
var trials = 0;
function getQ(state, actionSet) {
  var config = [ state.diffY, state.speedY, state.tubeX, actionSet ];
  if (!(config in Q_table)) {
     return 0;
  }
  return Q_table[config];
}
function getQKey(state, action) {
    return state.speedY + "_" + state.tubeX + "_" + state.diffY + "_" + action;
}
function setQValue(key, value) {
    Q_table[key] = value;
}
function setQ(state, action, updateValue, futureAction, futureState) {
    var qKey = getQKey(state, action);
    var qValue = getQ(qKey);
    if (state != null) { // add null check
      if (qValue == null) {
        qTable[qKey] = 0;
      }
      var futureValue = 0;
      if (futureState != null && futureAction != null) { // add null check
        futureValue = getQ(futureState, futureAction);
      }
      var newQValue = qValue + updateValue + alpha * (futureValue - qValue);
      setQValue(qKey, newQValue);
    }
  }

function getAction(state) {

  var takeRandomDecision = Math.random();
  if (takeRandomDecision < epsilon) {
    console.log("Going random baby!");

    var shouldJump = ((Math.random() * 100 )%4 == 0);
    if (shouldJump) {
        return actionSet.JUMP;
    } else {
        return actionSet.STAY;
    }
  }
  var rewardForStay = getQ(state, actionSet.STAY);
  var rewardForJump = getQ(state, actionSet.JUMP);

  if (rewardForStay > rewardForJump) {
    return actionSet.STAY;
  } else if (rewardForStay < rewardForJump) {
    return actionSet.JUMP;
  } else {
    var shouldJump = (Math.ceil( Math.random() * 100 )%25 == 0); 
    if (shouldJump) {
        return actionSet.JUMP;
    } else {
        return actionSet.STAY;
    }    
  }
}



function rewardTheBird(reward, wasSuccessful) {
  var minFramSize = 5;
  var theta = 1;

  var frameSize = Math.max(minFramSize, episodeFrameCount);

  for (var i = frameBuffer.length-2; i >= 0 && frameSize > 0; i--) {
    var config = frameBuffer[i];
    var state  = config.env;
    var action = config.action;
    if (state != null && state.diffY != null) { // add null check
      var rewardForState = (reward - Math.abs(state.diffY));
      if (!wasSuccessful) {
        if (state.diffY >= theta && action == actionSet.JUMP) {
          rewardForState = -rewardForState;
        } else if(state.diffY <= -theta && action == actionSet.STAY) {
          rewardForState = -rewardForState;
        } else {
          rewardForState = +0.5;
        }
      }
      var futureState = frameBuffer[i+1].env;
      var futureAction = frameBuffer[i+1].action; // fix typo
      if (futureState != null) { // add null check
        var optimalFutureValue = Math.max(getQ(futureState, actionSet.STAY), 
                                        getQ(futureState, actionSet.JUMP));
        var updateValue = alpha*(rewardForState + gamma * optimalFutureValue - getQ(state, actionSet, true)); // add true for SARSA

        setQ(state, actionSet, updateValue, futureAction, futureState); // add futureAction and futureState
        frameSize--;
      }
    }
  }
  if (frameBuffer.length > 0) {
    var config = frameBuffer[frameBuffer.length-1];
    var state  = config.env;
    var action = config.action;
    if (state != null) { // add null check
      setQ(state, actionSet, reward, null, null);
    }
  }
}



function triggerGameOver() {
  var reward =  100;
  rewardTheBird(reward, false, null, null);
  console.log( "GameOver:", score, Object.keys(Q_table).length, trials );

  targetTubeIndex = -1;
  episodeFrameCount = 0;
  trials++;
}
function nextStep() {
  if (gameState != GAME)
   return;
  if (birdX < tubes[0].x + 3 && (tubes[0].x < tubes[1].x || tubes[1].x + 3 < birdX)) {
    targetTube = tubes[0];
    if (targetTubeIndex == 1) {
      rewardTheBird(5, true, null, null);
    }
    targetTubeIndex = 0;
  } else  {
    targetTube = tubes[1];
    if (targetTubeIndex == 0) {
      rewardTheBird(5, true, null, null);
    }
    targetTubeIndex = 1;
  }
  if (targetTube.x - birdX > 28) {
    return;
  }

  var state = {
    speedY: Math.round(birdYSpeed * 100),
    tubeX: targetTube.x,
    diffY: (targetTube.y+17+6) - (birdY+1)
  };

  var actionToBeTaken = getAction(state);

  var config = {
    env: state,
    action: actionToBeTaken
  };  
  frameBuffer.push(config);
  episodeFrameCount++;

  if (actionToBeTaken == actionSet.JUMP) {
    birdYSpeed = -1.4;
  } else {
  }  

  if (frameBuffer.length > 1) {
    var lastConfig = frameBuffer[frameBuffer.length-1];
    var lastState = lastConfig.env;
    var lastAction = lastConfig.action;
    rewardTheBird(0, true, lastState, lastAction);
  }
}