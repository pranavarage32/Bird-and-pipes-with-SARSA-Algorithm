// Define the neural network model
const model = tf.sequential();
model.add(tf.layers.dense({units: 16, inputShape: [3], activation: 'relu'}));
model.add(tf.layers.dense({units: 2, activation: 'linear'}));
model.compile({loss: 'meanSquaredError', optimizer: 'adam'});

// Define the action set
const actionSet = {
  STAY: 0,
  JUMP: 1
};

var trials = 0;
// Define the discount factor and learning rate
const gamma = 0.8;
const alpha = 0.1;

// Define the frame buffer and episode frame count
const frameBuffer = [];
let episodeFrameCount = 0;

// Define the target tube index and target tube
// let targetTubeIndex;
// let targetTubeIndex = 0;
// let targetTube;
// let targetTube = { x: 0, y: 0 };

// Define the number of trials
let trials = 0;

// Function to preprocess the state
function preprocessState(state) {
  return [state.speedY, state.tubeX, state.diffY];
}

// Function to get the Q-values for the given state
function getQ(state) {
  const stateTensor = tf.tensor2d([preprocessState(state)]);
  const qValues = model.predict(stateTensor);
  return qValues.dataSync()[0];
}

// Function to update the Q-values for the given state and action
async function setQ(state, action, reward, nextState) {
  const stateTensor = tf.tensor2d([preprocessState(state)]);
  const nextStateTensor = tf.tensor2d([preprocessState(nextState)]);
  const qValues = model.predict(stateTensor);
  const nextQValues = model.predict(nextStateTensor);
  const maxNextQValue = nextQValues.max().dataSync()[0];
  const target = reward + gamma * maxNextQValue;
  qValues.dataSync()[action] = (1 - alpha) * qValues.dataSync()[action] + alpha * target;
  await model.fit(stateTensor, qValues);
}

// Function to get the action for the given state
function getAction(state) {
  const stateTensor = tf.tensor2d([preprocessState(state)]);
  const qValues = model.predict(stateTensor);
  const randomValue = Math.random();
  if (randomValue < 0.1) {
    console.log("Going random baby!");
    return Math.floor(Math.random() * 2);
  } else {
    return qValues.argMax(1).dataSync()[0];
  }
}

// Function to update the neural network model
async function updateModel(reward, wasSuccessful) {
  const minFrameSize = 5;
  const theta = 1;
  const frameSize = Math.max(minFrameSize, episodeFrameCount);
  for (let i = frameBuffer.length - 2; i >= 0 && frameSize > 0; i--) {
    const config = frameBuffer[i];
    const state = config.env;
    const action = config.action;
    const rewardForState = reward - Math.abs(state.diffY);
    let rewardForAction;
    if (!wasSuccessful) {
      if (state.diffY >= theta && action == actionSet.JUMP) {
        rewardForAction = -rewardForState;
      } else if (state.diffY <= -theta && action == actionSet.STAY) {
        rewardForAction = -rewardForState;
      } else {
        rewardForAction = 0.5;
      }
    } else {
      rewardForAction = rewardForState;
    }
    const nextState = i == frameBuffer.length - 2 ? frameBuffer[i + 1].env : config.env;
    await setQ(state, action, rewardForAction, nextState);
    frameSize--;
  }
  frameBuffer.splice(0, Math.max(frameBuffer.length - minFrameSize, 1));
  episodeFrameCount = 0;
}

// Function to trigger game over
function triggerGameOver() {
  const reward = 100;
  updateModel(reward, false);
  console.log("GameOver:", score, trials);
  targetTubeIndex = -1;
  episodeFrameCount = 0;
  trials++;
}



// Function to perform the next step
function nextStep() {
    let targetTube = { x: 0, y: 0 };
    let targetTubeIndex = 0;
  if (gameState != GAME)
    return;
  if (birdX < tubes[0].x + 3 && (tubes[0].x < tubes[1].x || tubes[1].x + 3 < birdX)) {
    targetTube = tubes[0];
    if (targetTubeIndex == 1) {
      updateModel(5, true);
    }
    targetTubeIndex = 0;
  } else {
    targetTube = tubes[1];
    if (targetTubeIndex == 0) {
      updateModel(5, true);
    }
    targetTubeIndex = 1;
  }
  if (targetTube.x - birdX > 28) {
    return;
  }
  const state = {
    speedY: Math.round(birdYSpeed * 100),
    tubeX: targetTube.x,
    diffY: (targetTube.y + 17 + 6) - (birdY + 1)
  };
  const actionToBeTaken = getAction(state);
  const config = {
    env: state,
    action: actionToBeTaken
  };
  frameBuffer.push(config);
  episodeFrameCount++;
  if (actionToBeTaken == actionSet.JUMP) {
    birdYSpeed = -1.4;
  }
}

