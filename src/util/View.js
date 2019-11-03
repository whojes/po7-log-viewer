const loadingOn = () => {
  document.getElementById("page-loading").style.display = "block";
}

const loadingOff = () => {
  document.getElementById('page-loading').style.display = "none";
}

const getRandomColor = () => {
  let R = (255-(Math.random()*0x50<<0)).toString(16);
  let G = (255-(Math.random()*0x50<<0)).toString(16);
  let B = (255-(Math.random()*0x50<<0)).toString(16);
  let color = '#'+R+G+B;
  return color;
}

export {
  loadingOn,
  loadingOff,
  getRandomColor,
}