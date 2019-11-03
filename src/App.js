import React from 'react';
import Modal from 'react-modal';
import { withAlert } from 'react-alert';

import Cookies from "js-cookie";
import { VT, modalStyle, whojes } from "./config/const";
import { msgType } from "./config/msgType";
import { loadingOff, loadingOn, getRandomColor } from "./util/View";

import './App.css';
import FileListChanger from "./modal/FileListChanger";
import Connection from './modal/Connection';
import { NotConnected, Data } from './container';
import { connectWebSocket } from './util/WebSocket';


class App extends React.Component {
  constructor() {
    super();
    window.WebSocket = window.WebSocket || window.MozWebSocket;
    this.state = {
      // about connection info
      connection: {
        ip: "",
        user: "",
        authType: VT.authType.PASSWORD,
        pwd: "",
        poDirectory: "",
      },
      isConnected: false, 
      dynamicType: VT.dynamicType.DYNAMIC,

      displayOption: {
        stopTracking: false,
        goToBottom: true,
        regex: null,
        regexType: VT.regexStyle.OPAQUE,
      },

      existLogFileList: [],
      fileList: [],
      trackingFileList: {},
      catedFile: "",

      modalIsOpen: false,
      modalBody: null,

      webSocket: null,

      data: [],
      markers: [],
      
      needToReload: false,
      removeAllTrackingFiles: false,
      inspectPODir: false,
    };

    this.importApplied = false;
    this.inspectPOHomeStdOut = "";
    this.staticData = "";
    this.errorMessage = "";
    this.showFileListStdOut = "";
  }

  static getDerivedStateFromProps(props, state) {
    if(props.importVal) {
      return {}
    }

    let derivedState = {};
    if(Cookies.get("connection.save") === "true"){
      if (!state.isConnected) {
        let newConnection = Object.assign({}, state.connection);
        newConnection.ip = Cookies.get("connection.ip");
        newConnection.user = Cookies.get("connection.user");
        newConnection.authType = Cookies.get("connection.authType");
        newConnection.pwd = Cookies.get("connection.pwd");
        newConnection.poDirectory = Cookies.get("connection.poDirectory");
        derivedState["connection"] = newConnection;
      }

      if(Cookies.get("displayOption.save")){
        // TODO
      }
    }
    return derivedState;
  }

  componentDidMount () {
    Modal.setAppElement("body");

    // when importded
    if(this.props.importVal && !this.importApplied){
      this.importApplied = true;
      this._import();
      return;
    }
    if(this.state.connection.ip && this.state.connection.user && this.state.connection.pwd && this.state.connection.poDirectory){
      this._connectToServer();
    } else {
      this.setState({
        modalIsOpen: true,
        modalBody: <Connection changeParent={ this._changeParent } connection={ this.state.connection } messageHandler={ this._messageHandler } 
                    webSocket={ this.state.webSocket } inspectPODir={ this.state.inspectPODir }/>
      });
    }
  }

  componentDidUpdate () {
    if (this.importApplied && !this.state.isConnected ) {
      this._connectToServer();
      return;
    }

    if(Cookies.get("connection.save") === "true" && Cookies.get("fileList.save") === "true" && Cookies.get("fileList.file") && this.state.fileList.length === 0){
      let newFileList = Cookies.get("fileList.file").split(":");
      this.setState({
        fileList: newFileList,
      });
    }

    if( !this.state.webSocket && this.state.data.length !== 0 ) {
      this.setState({
        data: []
      });
      return;
    }

    if (this.state.removeAllTrackingFiles) {

    }

    if((!this.state.isConnected && !this.state.modalIsOpen) || this.state.needToReload) {
      this.setState({
        modalIsOpen: true,
        needToReload: false,
        modalBody: <Connection changeParent={ this._changeParent } connection={ this.state.connection } messageHandler={ this._messageHandler } 
                    webSocket={ this.state.webSocket } inspectPODir={ this.state.inspectPODir }/>
      });
      return;
    }
  }

  _changeParent = {
    setState: (ary) => {
      this.setState(ary)
    }
  }

  _connectToServer = () => {
    const ws = connectWebSocket(this.state.connection, this._messageHandler, this.state.webSocket, () => {
      this.setState({
        webSocket: ws,
        isConnected: true,
        data: [],
      });
    });
  }

  _messageHandler = (message) => {
    const msg = JSON.parse(message.data);
    // console.log(msg);
    switch(msg.type) {
      case msgType.HANDSHAKE:
        if ( msg.status ) {
          if( this.importApplied && this.state.catedFile && this.state.data.length === 0) {
            this._trackFile(this.state.catedFile, VT.dynamicType.STATIC);
          }
        } else {
          alert( msg.message );
          if(this.state.webSocket){
            this.state.webSocket.close();
          }
          this.setState({ 
            webSocket: null,
            modalIsOpen: false, 
            isConnected: false,
          });
        }
        loadingOff();
        break;

      case msgType.FILETAIL:
        if (msg.status && msg.stdout) {
          const ary = msg.stdout.split("\n");
          ary.forEach(element => {
            if(!element) return;
            this.setState({
              data: this.state.data.concat({filepath: msg.filepath, line: element})
            });
          });
        }
        break;

      case msgType.FILEREAD:
        if (msg.status) {
          loadingOn();
          if(msg.stdout) {
            this.staticData += msg.stdout;
          } else if (msg.code === 0) {
            let a = this.staticData.split("\n").map((e, i) => {
              return {filepath: msg.filepath, line: e};
            });
            a.pop(); // last one is alway an empty space
            this.setState({
              data: a
            });
            this.staticData = "";
            loadingOff();
            if(this.errorMessage) {
              this.props.alert.error(this.errorMessage);
              this.errorMessage = "";
            }
          } else if (msg.stderr) {
            console.error(msg.stderr);
          }
        } else {
          this.errorMessage = msg.error;
        }
        break;
    
      case msgType.INSPECTPOHOME:
        if (msg.status) {
          if (msg.stdout) {
            this.inspectPOHomeStdOut += msg.stdout;
          } else if (msg.code === 0) {
            let a = this.inspectPOHomeStdOut;
            let result = a.includes("application") && a.includes("config") && a.includes("logs");
            this.setState({
              needToReload: true,
              inspectPODir: result,
            });
            this.inspectPOHomeStdOut = "";
          } else if (msg.stderr) {
            this.setState({
              needToReload: true,
              inspectPODir: false,
            });
            this.inspectPOHomeStdOut = "";
          }
        }
        break;

      case msgType.SHOWFILELIST:
        if (msg.status) {
          if (msg.stdout) {
            this.showFileListStdOut += msg.stdout;
          } else if (msg.code === 0) {
            let a = this.showFileListStdOut.split("\n");
            a.pop(); // last one is alway an empty space
            this.setState({
              existLogFileList: a
            });
            this.showFileListStdOut = "";
            this.setState({
              modalBody: <FileListChanger changeParent={ this._changeParent } fileList={ this.state.fileList } existLogFileList={ this.state.existLogFileList } 
                    trackingFileList={ this.state.trackingFileList } connection={ this.state.connection } alert={ this.props.alert }/>
            });
            loadingOff();
          } else if (msg.stderr) {
            this.showFileListStdOut = "";
            loadingOff();
          }
        } else {
          loadingOff();
        }
        break;

      default:
        break;
    }
  }

  _changeConnectionInfo = () => {
    this.setState({
      modalIsOpen: true,
      modalBody: <Connection changeParent={ this._changeParent } connection={ this.state.connection } messageHandler={ this._messageHandler } 
                   webSocket={ this.state.webSocket } inspectPODir={ this.state.inspectPODir }/>
    });
  }

  _changeFileList = () => {
    if( this.state.existLogFileList.length === 0 ) {
      loadingOn();
      this.state.webSocket.send(JSON.stringify({msgType: msgType.SHOWFILELIST, podirectory: this.state.connection.poDirectory }));
    }
    this.setState({
      modalIsOpen: true,
      modalBody: <FileListChanger changeParent={ this._changeParent } fileList={ this.state.fileList } existLogFileList={ this.state.existLogFileList } 
            trackingFileList={ this.state.trackingFileList } connection={ this.state.connection } alert={ this.props.alert }/>
    });
  }

  _changeDisplayOption = (key, value) => {
    let newDO = Object.assign({}, this.state.displayOption);
    newDO[key] = value;
    this.props.alert.show(`Change display ${key} option: ${this.state.displayOption[key]} => ${newDO[key]}`);
    this.setState({
      displayOption: newDO,
    });
  }

  _addMarker = () => {
    this.setState({
      markers: this.state.markers.concat(document.getElementById("custom-marker").value),
    });
  }

  _applyRegex = (val, rgt) => {
    let newDO = Object.assign({}, this.state.displayOption);

    let regString = document.getElementById("regex-input").value;
    if (regString === "" || !val) {
      newDO.regex = null;
      this.setState({
        displayOption: newDO
      });
      return;
    }

    let flags = regString.replace(/.*\/([gimy]*)$/, '$1');
    let pattern = regString.replace(new RegExp('^/(.*?)/'+flags+'$'), '$1');
    let regex;
    try{
      regex = new RegExp(pattern, flags);
    } catch (e) {
      alert("Wrong Formatted Regex.");
      return;
    }
    newDO.regex = regex;    
    newDO.regexType = rgt;

    this.setState({
      displayOption: newDO
    });
  }

  _trackFile = (filepath, vt) => {
    if(!filepath) {
      filepath = `${this.state.connection.poDirectory}/logs/${whojes.defaultFile}`;
    }
    let filename = filepath.split("/").pop();
    let msgtp = (vt === VT.dynamicType.STATIC) ? msgType.FILEREAD : msgType.FILETAIL;
    if( vt === VT.dynamicType.DYNAMIC ) {
      if(this.state.trackingFileList[filepath]){
        alert("already tracking...");
        return;
      }
      this.state.webSocket.send(JSON.stringify({msgType: msgtp, filepath: filepath }));
      let newTrackingFileList = Object.assign({}, this.state.trackingFileList);
      newTrackingFileList[filepath] = getRandomColor();
      this.props.alert.show(`File '${filename}' tailing...`);
      this.setState({
        trackingFileList: newTrackingFileList,
      });
    } else {
      if( this.state.catedFile && this.state.data.length === 0){

      } else if( this.state.catedFile === filepath ) {
        document.getElementById(filepath).style.backgroundColor = "white";
        this.setState({
          data: [],
          markers: [],
          catedFile: ""
        });
        return;
      } else if( this.state.catedFile ) {
        this.props.alert.error(`Clear the Fisrt File ${this.state.catedFile.split("/").pop()}`)
        return;
      }
      this.state.webSocket.send(JSON.stringify({msgType: msgtp, filepath: filepath }));
      this.setState({
        catedFile: filepath,
      });
    }
  }

  _removeTrackedFile = (filepath) => {
    if(!filepath) {
      filepath = `${this.state.connection.poDirectory}/logs/${whojes.defaultFile}`;
    }

    let newTrackingFileList = this.state.trackingFileList;
    if (!newTrackingFileList[filepath]) { 
      alert(`currently not tracking ${filepath.split("/").pop()}`);
      return;
    } else {
      document.getElementById(filepath).style.backgroundColor = "white";
      delete newTrackingFileList[filepath];
    }
    this.state.webSocket.send(JSON.stringify({msgType: msgType.FILETAILKILL, filepath: filepath })) ;
    this.props.alert.show(`Cancel '${filepath.split("/").pop()}' tailing...`);
    this.setState({
      trackingFileList: newTrackingFileList,
    });
  }

  _changeDynamicType = (dt) => {
    Object.keys(this.state.trackingFileList).forEach( key => {
      this._removeTrackedFile(key);
    });
    if(this.state.catedFile) {
      this._trackFile(this.state.catedFile, VT.dynamicType.STATIC);
    }
    this.setState({
      data: [],
      markers: [],
      dynamicType: dt,
    });
  }

  _export = () => {
    let url = window.location.origin + "/";
    let simpleFilelist = [];
    for (const item of this.state.fileList) {
      simpleFilelist.push(item.replace(`${this.state.connection.poDirectory}/logs/`, ""));
    }
    let queryString = [
      `ip=${this.state.connection.ip}`,
      `user=${this.state.connection.user}`,
      `pwd=${this.state.connection.pwd}`,
      `poDirectory=${this.state.connection.poDirectory}`,
      `dynamicType=${this.state.dynamicType}`,
      `fileList=${simpleFilelist.join(":")}`,
      `regex=${this.state.displayOption.regex}`,
      `catedFile=${this.state.catedFile ? this.state.catedFile : "null"}`
    ];
    url += btoa(queryString.join("&"));
    if( navigator.clipboard ) {
      navigator.clipboard.writeText(url);
      this.props.alert.success("URL이 복사되었습니다. 다른 연구원에게 공유해보세요.");
    } else {
      let tta = document.createElement("textarea");
      tta.value = url;
      document.body.appendChild(tta);
      tta.focus();
      tta.select();
      try {
        let a = document.execCommand('copy');
        if (a) {
          this.props.alert.success("URL이 복사되었습니다. 다른 연구원에게 공유해보세요.");
        } else {
          throw new Error();
        }

      } catch (err) {
        this.props.alert.error(`Clipboard에 접근권한이 없음.\n${url} `);
      }
      document.body.removeChild(tta);
    }
  }

  _import = async () => {
    try{
      let path = atob(this.props.importVal);
      const parsedValue = {};
      for (const item of path.split("&")) {
        let key = item.split("=")[0];
        let value = item.split("=")[1];
        parsedValue[key] = value;
      }
      console.log(parsedValue);
  
      let newconn = {
        ip: parsedValue.ip,
        user: parsedValue.user,
        pwd: parsedValue.pwd,
        poDirectory: parsedValue.poDirectory,
      };
      let newdo = Object.assign({}, this.state.displayOption);
      let newRegex = null;
      if (parsedValue.regex !== "null"){
        let flags = parsedValue.regex.replace(/.*\/([gimy]*)$/, '$1');
        let pattern = parsedValue.regex.replace(new RegExp('^/(.*?)/'+flags+'$'), '$1');
        newRegex = new RegExp(pattern, flags);
      }
      newdo.regex = newRegex;
      
      console.log(newdo);
      let newFileList = []
      if (parsedValue.fileList) {
        for (const item of parsedValue.fileList.split(":")) {
          newFileList.push(`${newconn.poDirectory}/logs/${item}`);
        }
      }
      this.setState({
        connection: newconn,
        displayOption: newdo,
        dynamicType: parsedValue.dynamicType,
        catedFile: parsedValue.catedFile === "null" ? "" : parsedValue.catedFile,
        fileList: newFileList,
      });
    } catch (err) {
      alert("WRONG URL");
      window.location.href = window.location.origin;
    }
  }

  render() {
    let mainBody;
    if (this.state.isConnected) {
      mainBody = (
        <div>
          <Data trackingFileList={ this.state.trackingFileList } data={ this.state.data } markers={ this.state.markers } displayOption={ this.state.displayOption }></Data>
        </div>
      )
    } else {
      mainBody = (<NotConnected/>)
    }

    let exportButton;
    // TODO
    if ( this.state.isConnected ) {
      exportButton = (
        <div className="option-button">
          <button onClick={ this._export }> EXPORT URL </button>
        </div>
      )
    } 

    return (
      <div id="po-log-app" className="App">
        <div className="header">
          <div className="upper-header">
            <p style={{display: "inline-block", float: "left"}}> <b> Choose and See ProObject's Log File in Browser </b></p>
            {/* proobject.log (default file) button */}
            <div id={ this.state.connection.poDirectory + "/logs/" + whojes.defaultFile } className="file-button">
              <div hidden={ this.state.dynamicType !== VT.dynamicType.STATIC }>                    
                <button onClick={ () => { this._trackFile(null, VT.dynamicType.STATIC) }}
                    hidden={ this.state.catedFile === this.state.connection.poDirectory + "/logs/" + whojes.defaultFile }> cat <b>ProObject.log</b> </button>
                <button onClick={ () => { this._trackFile(null, VT.dynamicType.STATIC) }}
                    hidden={ this.state.catedFile !== this.state.connection.poDirectory + "/logs/" + whojes.defaultFile } style={{backgroundColor: "gray"}}> remove <b>ProObject.log</b> </button>
              </div>
              <div hidden={ this.state.dynamicType !== VT.dynamicType.DYNAMIC }>    
                <button onClick={ () => { this._trackFile(null, VT.dynamicType.DYNAMIC) }} 
                    hidden={ this.state.trackingFileList[this.state.connection.poDirectory + "/logs/" + whojes.defaultFile] !== undefined }> tail <b>ProObject.log</b> </button>
                <button onClick={ () => this._removeTrackedFile() } style={{backgroundColor: this.state.trackingFileList[this.state.connection.poDirectory + "/logs/" + whojes.defaultFile]}}
                    hidden={ this.state.trackingFileList[this.state.connection.poDirectory + "/logs/" + whojes.defaultFile] === undefined }> stop tailing <b>ProObject.log</b> </button>
              </div>
            </div>
            {
              this.state.fileList.map((e, i) => {
                return (
                  <div id={ e } key={ i } className="file-button" title={ e }>
                    <div hidden={ this.state.dynamicType !== VT.dynamicType.STATIC }>
                      <button onClick={ () => this._trackFile(e, VT.dynamicType.STATIC) }
                          hidden={ this.state.catedFile === e }> cat <b>{ e.split('/').pop() }</b> </button>
                    </div>
                    <div hidden={ this.state.dynamicType !== VT.dynamicType.STATIC }>
                      <button onClick={ () => this._trackFile(e, VT.dynamicType.STATIC) } 
                          hidden={ this.state.catedFile !== e } style={{backgroundColor: "gray"}}> remove <b>{ e.split('/').pop() }</b> </button>
                    </div>
                    <div hidden={ this.state.dynamicType !== VT.dynamicType.DYNAMIC }>    
                      <button onClick={ () => this._trackFile(e, VT.dynamicType.DYNAMIC) } 
                          hidden={ this.state.trackingFileList[e] !== undefined }> tail <b>{ e.split('/').pop() }</b> </button>
                      <button onClick={ () => this._removeTrackedFile(e) } 
                          hidden={ this.state.trackingFileList[e] === undefined } style={{backgroundColor: this.state.trackingFileList[e]}}> stop tailing <b>{ e.split('/').pop() }</b> </button>
                    </div>
                  </div>
                )
              })
            }
            { exportButton }
            <div className="option-button">
              <button onClick={ this._changeConnectionInfo }> Change ProObject7 Server </button>
            </div>
            <div className="option-button">
              <button onClick={ this._changeFileList } > Change Files </button>
            </div>
            {/* dynamic <-> static change button */}
            <div className="option-button">    
              <button onClick={ () => this._changeDynamicType(VT.dynamicType.STATIC) } 
                  hidden={ this.state.dynamicType === VT.dynamicType.STATIC }> cat rather than tail </button>
              <button onClick={ () => this._changeDynamicType(VT.dynamicType.DYNAMIC) } 
                  hidden={ this.state.dynamicType === VT.dynamicType.DYNAMIC }> tail rather than cat </button>
            </div>
          </div>
          <div className="lower-header">
            <p> Display Options </p>
            <div className="option-block">
              <button onClick={ () => { this.setState({data: [], markers: []}) } }> Clear </button>
            </div>
            <div className="option-block">
              <button onClick={ () => this._changeDisplayOption("goToBottom", true) } hidden={ this.state.displayOption.goToBottom }> Go to the Bottom Always </button>
              <button onClick={ () => this._changeDisplayOption("goToBottom", false) } hidden={ !this.state.displayOption.goToBottom }> Stop Going to the Bottom  </button>
            </div>
            <div className="option-block" hidden={ this.state.dynamicType !== VT.dynamicType.DYNAMIC }>
              <button onClick={ () => this._changeDisplayOption("stopTracking", true) } hidden={ this.state.displayOption.stopTracking }> Stop for a while </button>
              <button onClick={ () => this._changeDisplayOption("stopTracking", false) } hidden={ !this.state.displayOption.stopTracking }> Restart </button>
            </div>

            <div className="option-block">
              <input id="custom-marker" type="input" name="value" defaultValue="Lorem ipsum" onKeyDown={ (e) => {
                if (e.key === 'Enter') {
                  this._addMarker();
                }
              }}/>
              <button onClick={ this._addMarker } > add a Marker </button>
            </div>

            <div className="option-block">
              <input id="regex-input" type="input" name="value" placeholder="REGEX ex.) /SEVERE/g" defaultValue={ this.state.displayOption.regex } onKeyDown={ (e) => {
                if (e.key === 'Enter') {
                  this._applyRegex(true, VT.regexStyle.OPAQUE);
                }
              }}/>
              <button onClick={ () => this._applyRegex(true, VT.regexStyle.BANISH) } > apply Banish </button>
              <button onClick={ () => this._applyRegex(true, VT.regexStyle.OPAQUE) } > apply Opaque </button>
              <button onClick={ () => this._applyRegex(false) } > Remove </button>
              <button onClick={ () => window.open(`${whojes.regexHelp}`, "_blank") }> what's regex?</button>
            </div>
          </div>
        </div>
        <div className="body">
          { mainBody }
        </div>
        <Modal
          isOpen={ this.state.modalIsOpen }
          onRequestClose={() => this.setState({modalIsOpen: false})}
          style={ modalStyle }
        > 
          { this.state.modalBody }
        </Modal>
      </div>
    )
  }
}

export default withAlert()(App);
