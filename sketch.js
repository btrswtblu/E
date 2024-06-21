let video;
let poseNet;
let poses = [];
var alice;
var aliceImage; // 앨리스 이미지를 저장할 변수
var aliceImage1; // 앨리스1 이미지를 저장할 변수
var boxes1, boxes2;
var fixedBoxes;
let scoreChanges = []; // 점수 변화를 저장할 배열

let easing = 0.05;
let currentColor;
let maxSize = false;
let rectWidth = 70; // 네모의 너비를 70으로 설정
let rectHeight = 112; // 네모의 높이를 112로 설정
let targetWidth = rectWidth; // 목표 너비
let targetHeight = rectHeight; // 목표 높이
let score = 0; // 점수 변수
let allBoxesRemoved = false; // 모든 박스가 제거되었는지 확인하는 변수

const areaWidth = 800;
const areaHeight = 600;
let currentImage; // 현재 이미지를 저장할 변수
let imageIndex = 0; // 이미지를 번갈아 가리키기 위한 인덱스
let rabbitImage; // 토끼 이미지를 저장할 변수
let scoreImage; // 점수 이미지를 저장할 변수

let numberImages = {}; // 숫자 이미지를 저장할 객체
let minusImage; // 마이너스 기호 이미지를 저장할 변수

function preload() {
  aliceImage = loadImage('앨리스.png'); // 이미지 로드
  aliceImage1 = loadImage('앨리스1.png'); // 이미지1 로드
  rabbitImage = loadImage('토끼.png'); // 토끼 이미지 로드
  scoreImage = loadImage('score.png'); // 점수 이미지 로드

  // 숫자와 마이너스 기호 이미지를 로드
  for (let i = 0; i < 10; i++) {
    numberImages[i] = loadImage(`${i}.png`);
  }
  minusImage = loadImage('마이너스.png');
}

function setup() {
  createCanvas(960, 720);
  video = createCapture(VIDEO);
  video.size(width, height);

  // Create a new poseNet method with a single detection
  poseNet = ml5.poseNet(video, modelReady);
  // This sets up an event that fills the global variable "poses"
  // with an array every time new poses are detected
  poseNet.on('pose', function (results) {
    poses = results;
  });
  // Hide the video element, and just show the canvas
  video.hide();

  currentImage = aliceImage; // 초기 이미지를 '앨리스.png'로 설정

  // 이미지 교체를 위한 setInterval 함수 설정
  setInterval(() => {
    imageIndex = (imageIndex + 1) % 2; // 0과 1을 번갈아 가리키는 인덱스
    currentImage = imageIndex === 0 ? aliceImage : aliceImage1; // 이미지 교체
  }, 1000); // 1초마다 실행

  initializeGame();
}

function modelReady() {
  select('#status').html('Model Loaded');
}

function mousePressed() {
  console.log(JSON.stringify(poses));
}

function draw() {
  background(255);
  noStroke(); // 테두리 제거
  strokeWeight(2);

  // 회색 띠 그리기
  fill(200); // 회색
  rect((width - areaWidth) / 2, (height - areaHeight) / 2, areaWidth, areaHeight); // 화면 중간에 800x600 크기의 회색 사각형

  if (boxes1.length === 0 && boxes2.length === 0) {
    allBoxesRemoved = true;
  }

  if (allBoxesRemoved) {
    displayFinalScore();
    return;
  }

  // For one pose only (use a for loop for multiple poses!)
  if (poses.length > 0) {
    let pose = poses[0].pose;

    let leftWrist = pose['leftWrist'];
    let rightWrist = pose['rightWrist'];

    let targetD = dist(leftWrist.x, leftWrist.y, rightWrist.x, rightWrist.y);
    let targetX = (leftWrist.x + rightWrist.x) / 2;
    let targetY = (leftWrist.y + rightWrist.y) / 2;

    // 네모의 목표 크기를 손목 거리의 비율에 따라 조정
    targetWidth = map(targetD, 100, 300, 10, 150); // 최대 크기를 150으로 변경
    targetHeight = map(targetD, 100, 300, 10 * (112 / 70), 150 * (112 / 70)); // 비율을 유지한 높이 설정
    targetWidth = constrain(targetWidth, 10, 300); 
    targetHeight = constrain(targetHeight, 10 * (112 / 70), 300 * (112 / 70)); 

    // Smoothly interpolate to the target position
    alice.position.x += (targetX - alice.position.x) * easing;
    alice.position.y += (targetY - alice.position.y) * easing;

    // Smoothly interpolate to the target size
    rectWidth += (targetWidth - rectWidth) * easing;
    rectHeight += (targetHeight - rectHeight) * easing;
  }

  // 이미지 크기를 조정
  alice.width = rectWidth; // 네모의 너비를 조정
  alice.height = rectHeight; // 네모의 높이를 조정

  handleCollisions();

  // 점수 이미지를 왼쪽 위에 표시
  image(scoreImage, 10, 10, 160, 38); // 이미지를 더 길게 조정하여 표시

  // 게임 중 점수를 그릴 때
  let gameScoreWidth = 23; // 게임 중 점수 이미지 너비
  let gameScoreHeight = 35; // 게임 중 점수 이미지 높이
  drawScore(score, 190, 10, gameScoreWidth, gameScoreHeight);

  // 고정된 박스들이 회색 판 밖으로 나가지 못하게 하기
  constrainBoxes(fixedBoxes, (width - areaWidth) / 2, (width + areaWidth) / 2, (height - areaHeight) / 2, (height + areaHeight) / 2);
  constrainBoxes(boxes1, (width - areaWidth) / 2, (width + areaWidth) / 2, (height - areaHeight) / 2, (height + areaHeight) / 2);
  constrainBoxes(boxes2, (width - areaWidth) / 2, (width + areaWidth) / 2, (height - areaHeight) / 2, (height + areaHeight) / 2);

  drawSprites();

  // 앨리스 이미지를 캔버스에 그리기
  image(currentImage, alice.position.x - alice.width / 2, alice.position.y - alice.height / 2, alice.width, alice.height);

  // 점수 변화를 그리기
  displayScoreChanges();

  // 초록색 네모들을 '토끼.png'로 대체하여 그리기
  for (let i = 0; i < boxes1.length; i++) {
    let box = boxes1[i];
    image(rabbitImage, box.position.x - box.width / 2, box.position.y - box.height / 2, box.width, box.height);
  }

  // 핑크색 네모들을 '토끼.png'로 대체하여 그리기
  for (let i = 0; i < boxes2.length; i++) {
    let box = boxes2[i];
    image(rabbitImage, box.position.x - box.width / 2, box.position.y - box.height / 2, box.width, box.height);
  }
}

function drawScore(score, x, y, imageWidth, imageHeight) {
  let scoreStr = score.toString();
  let offsetX = 0;

  for (let i = 0; i < scoreStr.length; i++) {
    let char = scoreStr.charAt(i);

    if (char === '-') {
      image(minusImage, x + offsetX, y, imageWidth, imageHeight); // 마이너스 기호 이미지
      offsetX += imageWidth;
    } else {
      let num = int(char);
      image(numberImages[num], x + offsetX, y, imageWidth, imageHeight); // 숫자 이미지
      offsetX += imageWidth;
    }
  }
}

function handleCollisions() {
  if (rectWidth < 65) {
    alice.collide(boxes1); 
  } else {
    alice.displace(boxes1); 
  }

  if (rectWidth < 100) {
    alice.collide(boxes2); 
  } else {
    alice.displace(boxes2); 
  }

  // 초록색 네모와 검정색 네모의 충돌 처리
  for (let i = boxes1.length - 1; i >= 0; i--) {
    let greenBox = boxes1[i];
    for (let j = 0; j < fixedBoxes.length; j++) {
      let blackBox = fixedBoxes[j];
      if (blackBox.width === 80 && isContained(greenBox, blackBox)) {
        scoreChanges.push({ x: greenBox.position.x, y: greenBox.position.y, value: '+10', alpha: 255 });
        greenBox.remove();
        score += 10; // 점수 10점 증가
        break;
      } else if (blackBox.width === 120 && isContained(greenBox, blackBox)) {
        scoreChanges.push({ x: greenBox.position.x, y: greenBox.position.y, value: '-5', alpha: 255 });
        greenBox.remove();
        score -= 5; // 점수 5점 감소
        break;
      }
    }
  }

  // 핑크색 네모와 120 크기 검정색 네모의 충돌 처리
  for (let i = boxes2.length - 1; i >= 0; i--) {
    let pinkBox = boxes2[i];
    for (let j = 0; j < fixedBoxes.length; j++) {
      let blackBox = fixedBoxes[j];
      if (blackBox.width === 120 && isContained(pinkBox, blackBox)) {
        scoreChanges.push({ x: pinkBox.position.x, y: pinkBox.position.y, value: '+20', alpha: 255 });
        pinkBox.remove();
        score += 20; // 점수 20점 증가
        break;
      }
    }
  }
}

// 네모 A가 네모 B 안에 완전히 포함되는지 확인하는 함수
function isContained(boxA, boxB) {
  return (
    boxA.position.x - boxA.width / 2 >= boxB.position.x - boxB.width / 2 &&
    boxA.position.x + boxA.width / 2 <= boxB.position.x + boxB.width / 2 &&
    boxA.position.y - boxA.height / 2 >= boxB.position.y - boxB.height / 2 &&
    boxA.position.y + boxA.height / 2 <= boxB.position.y + boxB.height / 2
  );
}

// 박스들이 특정 범위를 벗어나지 못하게 하는 함수
function constrainBoxes(boxes, xMin, xMax, yMin, yMax) {
  for (let i = 0; i < boxes.length; i++) {
    let box = boxes[i];
    box.position.x = constrain(box.position.x, xMin + box.width / 2, xMax - box.width / 2);
    box.position.y = constrain(box.position.y, yMin + box.height / 2, yMax - box.height / 2);
  }
}

// 점수 변화를 표시하는 함수
function displayScoreChanges() {
  textSize(24);
  for (let i = scoreChanges.length - 1; i >= 0; i--) {
    let change = scoreChanges[i];
    fill(255, change.alpha);
    text(change.value, change.x, change.y);
    change.alpha -= 5;
    if (change.alpha <= 0) {
      scoreChanges.splice(i, 1);
    }
  }
}

// 모든 박스가 제거되었을 때 최종 점수를 표시하는 함수
function displayFinalScore() {
  fill(0);
  textSize(48);
  textAlign(CENTER, CENTER);
  image(scoreImage, width / 2 - 240, height / 2 - 60, 300, 75); // 점수 이미지를 더 길게 조정하여 표시
  let finalScoreWidth = 42; // 최종 점수 이미지 너비
  let finalScoreHeight = 63; // 최종 점수 이미지 높이
  drawScore(score, width / 2 + 140, height / 2 - 55, finalScoreWidth, finalScoreHeight);
  textSize(24);
  text('Press the spacebar to restart', width / 2, height / 2 + 65); // 작은 텍스트 추가
}

function keyPressed() {
  if (key === ' ') {
    allBoxesRemoved = false;
    score = 0;
    resetGame();
  }
}

function initializeGame() {
  fixedBoxes = new Group();
  boxes1 = new Group();
  boxes2 = new Group();

  for (let i = 0; i < 2; i++) {
    let box = createSprite(random((width - areaWidth) / 2, (width + areaWidth) / 2 - 80), random((height - areaHeight) / 2, (height + areaHeight) / 2 - 80), 80, 80);
    box.shapeColor = color(0, 0, 0); // 검정 색 80 크기
    fixedBoxes.add(box);
  }
  for (let i = 0; i < 1; i++) {
    let box = createSprite(random((width - areaWidth) / 2, (width + areaWidth) / 2 - 120), random((height - areaHeight) / 2, (height + areaHeight) / 2 - 120), 120, 120);
    box.shapeColor = color(0, 0, 0); // 검정 색 120 크기
    fixedBoxes.add(box);
  }

  alice = createSprite(200, 200, rectWidth, rectHeight);
  alice.shapeColor = color(0, 0, 255, 0); // 투명색으로 변경

  for (let i = 0; i < 10; i++) {
    let box = createSprite(random((width - areaWidth) / 2, (width + areaWidth) / 2 - 44), random((height - areaHeight) / 2, (height + areaHeight) / 2 - 60), 44, 60);
    box.shapeColor = color(0, 255, 0, 0); // 반투명 초록
    boxes1.add(box);
  }

  for (let i = 0; i < 10; i++) {
    let box = createSprite(random((width - areaWidth) / 2, (width + areaWidth) / 2 - 77), random((height - areaHeight) / 2, (height + areaHeight) / 2 - 105), 77, 105);
    box.shapeColor = color(255, 105, 180, 0); // 반투명 핑크
    boxes2.add(box);
  }
}

function resetGame() {
  // 모든 스프라이트 제거
  fixedBoxes.removeSprites();
  boxes1.removeSprites();
  boxes2.removeSprites();
  alice.remove();

  // 게임 초기화
  initializeGame();
}

