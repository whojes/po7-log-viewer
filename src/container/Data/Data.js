import React from "react";

import jsxToString from 'jsx-to-string';

import "./Data.css";
import { VT } from "../../config/const";
import { loadingOn, loadingOff } from "../../util/View";

class Data extends React.Component {
  
  constructor () {
    super();
    this.currentDataLine = 0;
    this.currentMarkerLine = 0;
    this.appliedRegex = null;
  }

  componentDidMount () {
  }

  componentDidUpdate() {
    if(this.props.data.length === 0 && this.props.markers.length === 0) {
      document.getElementById("data-display-area").innerHTML = "";
      this.currentDataLine = 0;
      this.currentMarkerLine = 0;
    }

    // apply regex
    if(this.props.displayOption.regex !== this.appliedRegex){
      loadingOn();
      document.getElementById("data-display-area").childNodes.forEach(element => {
        let a = element.firstChild.nextSibling;
        if (!a) // custom marker 
          return;
        a = a.lastChild.previousSibling;
        element.style.display = "block";
        element.style.opacity = 1;
        if (this.props.displayOption.regex) {
          if (a.innerHTML.search(this.props.displayOption.regex) < 0) {
            if (this.props.displayOption.regexType === VT.regexStyle.OPAQUE) {
              element.style.opacity = 0.45;
            } else {
              element.style.display = "none";
            }
          }
        }
      });
      loadingOff();
      this.appliedRegex = this.props.displayOption.regex;
    }

    // draw custom marker
    for(this.currentMarkerLine; this.currentMarkerLine < this.props.markers.length; this.currentMarkerLine++ ){
      let a = document.createElement("div");
      a.innerHTML = `<div id="custum-marker-${this.currentMarkerLine}" style="color:red;display:inline-block"
        onClick="document.getElementById('custum-marker-${this.currentMarkerLine}').style.display = 'none'"> 
        ====== MARKER HERE: ${this.props.markers[this.currentMarkerLine]} ====== CLICK TO REMOVE ======`;
      document.getElementById("data-display-area").appendChild(a);
    }

    if(this.props.displayOption.goToBottom && this.messagesEnd && !this.props.displayOption.stopTracking){
      this.messagesEnd.scrollIntoView({ behavior: "smooth" });
    }

    // don't draw
    if(this.props.displayOption.stopTracking) {
      return;
    }

    for(this.currentDataLine; this.currentDataLine < this.props.data.length; this.currentDataLine++ ) {
      let elem = this.props.data[this.currentDataLine];
      let display = 'block';
      let opacity = 1;
      if (this.appliedRegex) {
        if(elem.line.search(this.appliedRegex) < 0) {
          if(this.props.displayOption.regexType === VT.regexStyle.OPAQUE) {
            opacity = 0.45;
          } else {
            display = 'none';
          }
        }
      }
      let oneLine = (
        <div className="one-line" key={ elem.filepath + "-" + this.currentDataLine } title={ elem.filepath } style={`display:${display};opacity:${opacity};color:${this.props.trackingFileList[elem.filepath]}`}>
          <div>
            <div className="numbering">
              { `[${this.currentDataLine}]` }
            </div>
            <div className="data-with-number">
              { elem.line }
            </div>
          </div>
        </div>
      );
      let a = document.createElement("div");
      a.innerHTML = jsxToString(oneLine).replace("className", "class").replace("className", "class").replace("className", "class");
      document.getElementById("data-display-area").appendChild(a.firstChild);
    }

    if(this.props.displayOption.goToBottom && this.messagesEnd) {
      this.messagesEnd.scrollIntoView({ behavior: "smooth" });
    }
  }

  render()  {
    return (
      <div>
        <div id="data-display-area">
        </div>
        <div style={{ float:"left", clear: "both" }} ref={(el) => this.messagesEnd = el}></div>
      </div>
    )
  }
}

export default Data;

