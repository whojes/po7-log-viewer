import React from 'react';
import ReactDOM from 'react-dom';

import {  transitions, positions, Provider as AlertProvider } from 'react-alert';
import AlertTemplate from 'react-alert-template-basic'

import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';

const options = {
  position: positions.BOTTOM_RIGHT,
  timeout: 5000,
  offset: '30px',
  transition: transitions.FADE,
}

const customAlert = (_ref) => {
  let newStyle = Object.assign({}, _ref.style);
  let newRef = Object.assign({}, _ref);

  newStyle.width = "50vw";
  newStyle.maxWidth = "1200px";

  newRef.style = newStyle;
  return AlertTemplate(newRef);
}

const importVal = window.location.pathname.replace("/", "");

const Root = () => (
  <AlertProvider template={ customAlert } {...options}>
    <App importVal={ importVal }/>
  </AlertProvider>
)

ReactDOM.render(<Root />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();