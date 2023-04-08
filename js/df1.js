var Q_table = {};
var actionSet = {
  STAY : 0,
  JUMP : 1
};

var gamma = 0.8; // Discounted rewards
var alpha = 0.1; // Learning rate

var frameBuffer = [];
var episodeFrameCount = 0;
var targetTubeIndex;
var targetTube;
var trials = 0;

function getQ(state, action) {
  var config = [ state.diffY, state.speedY, state.tubeX, action ];
  if (!(config in Q_table)) {
     return 0;
  }
  return Q_table[config];
}

function setQ(state, action, reward) {
  var config = [ state.diffY, state.speedY, state.tubeX, action ];
  if (!(config in Q_table)) {
    Q_table[config] = 0;
  }
  Q_table[config] += reward;
}

function getAction(state) {
  var takeRandomDecision = Math.ceil(Math.random() * 100000)%90001;
  if (takeRandomDecision == 0) {
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
    var futureAction = getAction(futureState);
    var optimalFutureValue = getQ(futureState, futureAction);
    var updateValue = alpha*(rewardForState + gamma * optimalFutureValue - getQ(state, action));
    setQ(state, action, updateValue)
    frameSize--;
  }
  frameBuffer = frameBuffer.slice(Math.max(frameBuffer.length-minFramSize, 1));
  episodeFrameCount = 0;
}

function triggerGameOver() {
  var reward =  100;
  rewardTheBird(reward, false);
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
      rewardTheBird(5, true);
    }
    targetTubeIndex = 0;
  } else  {
    targetTube = tubes[1];
    if (targetTubeIndex == 0) {
      rewardTheBird(5, true);
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
}