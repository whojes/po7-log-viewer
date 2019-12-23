import React from "react";

import Cookies from "js-cookie";

import "./Connection.css";
import { connectWebSocket } from "../util/WebSocket";
import { msgType } from "../config/msgType";

export default class Connection extends React.Component  {
  constructor() {
    super();
    this.state = {
      connection: {},
      save: Cookies.get("connection.save") === "true",
      inspectButtonClicked: false,
      connected: false,
      webSocket: null,
    }
  }

  componentDidMount () {
    if (this.props.webSocket) {
      this.setState({
        webSocket: this.props.webSocket,
        connected: true,
      });
      this._activateConnection(false);
    }
    if (this.props.connection !== this.state.connection) {
      this.setState({
        connection: this.props.connection,
      });
    }
  }

  componentDidUpdate() {
    if(document.getElementById("cim-podir")) {
      document.getElementById("cim-podir").focus();
    }
  }
  
  _setValue = (event) => {
    this.state.connection[event.target.name] = event.target.value;  
  }

  _keyDown = (event) => {
    if( event.key === 'Enter' )
      this._tryConnect();
  }

  _tryConnect = () => {
    const ws = connectWebSocket(this.state.connection, this.props.messageHandler, this.state.webSocket, () => {
      this._activateConnection(false);
      this.setState({
        webSocket: ws
      });
      this.props.changeParent.setState({
        webSocket: ws,
      });
    });
  }

  _activateConnection = (activate) => {
    if(activate) {
      if(this.state.webSocket) {
        this.state.webSocket.close();
        this.setState({webSocket : null});
      }
      document.getElementById("cim-ip").removeAttribute("disabled");
      document.getElementById("cim-user").removeAttribute("disabled");
      document.getElementById("cim-auth").removeAttribute("disabled");
    } else {
      document.getElementById("cim-ip").setAttribute("disabled", "disabled");
      document.getElementById("cim-user").setAttribute("disabled", "disabled");
      document.getElementById("cim-auth").setAttribute("disabled", "disabled");
    }
  }

  _enter = () => {
    if(!this.state.connection.poDirectory){
      alert("입력값을 입력해주세요.");
      return;
    }
    if(!this.state.inspectButtonClicked){
      alert("inspect PO Home 해보시죠?");
      return;
    }
    if(!this.props.inspectPODir) {
      if(!window.confirm("PO 디렉토리가 아닌거같은데, 괜찮습니까?")) return;
    }

    this.state.webSocket.onclose = () => {
      // alert(`앗! 왜 웹소켓이 끊겼을까요? 서버가 죽었나요?`);
      // window.location.reload();
    }

    if( this.state.save ) {
      Cookies.set("connection.save", true);
      Cookies.set("connection.user", this.state.connection.user);
      Cookies.set("connection.authType", this.state.connection.authType);
      Cookies.set("connection.pwd",this.state.connection.pwd);
      if (Cookies.get("connection.ip") !== this.state.connection.ip || Cookies.get("connection.poDirectory") !== this.state.connection.poDirectory) {
        Cookies.set("fileList.save", false);
        Cookies.set("fileList.file", "");
      }
      Cookies.set("connection.ip", this.state.connection.ip);
      Cookies.set("connection.poDirectory", this.state.connection.poDirectory);
    } else {
      Cookies.set("connection.save", false);
      Cookies.set("connection.ip", "");
      Cookies.set("connection.user", "");
      Cookies.set("connection.authType", "");
      Cookies.set("connection.pwd", "");
      Cookies.set("connection.poDirectory", "");
      Cookies.set("fileList.save", false);
      Cookies.set("fileList.file", "");
    }

    this.props.changeParent.setState({
      isConnected: true,
      modalIsOpen: false,
      webSocket: this.state.webSocket,
      data: [],
      fileList: Cookies.get("fileList.file") ? Cookies.get("fileList.file").split(":") : [],
      existLogFileList: [],
      connection: this.state.connection,
      removeAllTrackingFiles: true,
    });
  }
  
  _inspectPOHome = () => {
    if (this.state.connection.poDirectory === "") {
      return;
    } else if (!this.state.webSocket) {
      alert("연결 먼저 해보세요.");
      return;
    }
    this.state.webSocket.send(JSON.stringify({msgType: msgType.INSPECTPOHOME, command: `ls -al ${this.state.connection.poDirectory} `}));
    this.setState({
      inspectButtonClicked: true,
    });
  }

  render() {
    let inspectedPODir;
    if ( this.props.inspectPODir ) {
      inspectedPODir = (
        <div>
          이 디렉토리에는 PO가 설치되어있습니다...
        </div>
      )
    } else if ( this.state.inspectButtonClicked ) {
      inspectedPODir = (
        <div> 
          이 디렉토리에는 PO가 설치되어 있지 않아보입니다...
        </div>
      )
    } else {
      inspectedPODir = (
        <div>
        </div>
      )
    }
    let afterConnect;
    let poHomeHint;

    if(this.state.connection.ip === "192.168.6.240") {
      poHomeHint = [
        "/root/personal_pohome/jaesung_woo/AppCenter/",
        "/root/personal_pohome/junho_kim/AppCenter/",
        "/root/personal_pohome/jinwon_lee/AppCenter/",
        "/root/personal_pohome/jaewon_kim/AppCenter/",
        "/root/personal_pohome/jitae_yun/AppCenter/",
        "/root/personal_pohome/joonyoung_moon/AppCenter/",
        "/root/personal_pohome/seokchan_kwon/AppCenter/",
        "/root/personal_pohome/joungin_kim/AppCenter/",
      ]
    } else {
      poHomeHint = [
        "/root/proobject7/ProZone",
        "/opt/proiaas/rw_layer/root/proobject7/ProIaas",
        "/opt/pronet/rw_layer/root/proobject7/ProNet",
        "/opt/sysmaster/rw_layer/root/proobject7/SysMaster",
        "/root/proobject7"
      ]
    }

    if (this.state.webSocket) {
      afterConnect = (
        <div>
          <div className="unit" title="로그를 보고자 하는 ProObject의 Home Directory">
            <label>
              <span>PO Home Directory: </span>
              <input id="cim-podir" style={{minWidth: "500px"}} type='input' name='poDirectory' onChange={ this._setValue } onKeyDown={ (e) => {
                this.setState({
                  inspectButtonClicked: false,
                });
                if (e.key === 'Enter') {
                  this._inspectPOHome();
                }
              }} defaultValue={ this.state.connection.poDirectory } placeholder="/root/proobject7/ProZone"/>
              <button title="jps 명령어를 통해 확인" onClick={ () => this._inspectPOHome() }> inspect PO Home </button>
            </label>
          </div>
          { inspectedPODir }
          
          <div className="po-home-hint">
            <p><b> PO Home Hint (Click!) </b></p>
            {
              poHomeHint.map((element, i) => {
                return (
                  <div key={ i } onClick={ () => {
                    let newConn = Object.assign({}, this.state.connection);
                    newConn.poDirectory = element;
                    document.getElementById("cim-podir").value = element;
                    this.setState({
                      connection: newConn
                    });
                  }}>
                    { `[${i+1}] ${element}` }
                  </div>
                );
              })
            }
          </div>
          
          <div className="save" title="따뜻한 아메리카노 한 잔 주세요.">
            <label>
              <span>접속정보 저장</span>
              <input id='cim-user' type='checkbox' onChange={ (event) => this.setState({save: event.target.checked}) } defaultChecked={ this.state.save }/>
            </label>
            <button type="submit" onClick={ () => this._activateConnection(true) }>접속정보 수정</button>
            <button type="submit" onClick={ this._enter }>연결</button>
          </div>
        </div>
      )
    } else {
      afterConnect = (
        <div className="save" title="따뜻한 아메리카노 한 잔 주세요.">
          <button type="submit" onClick={ this._tryConnect }>접속해보기</button>
        </div>
      )
    }

    return (
      <div id="connection-info-modal">
        <h2 className="header">
          See ProObject's Log file in Browser
        </h2>
        <div className="unit" title="사내망에서 접근할 수 있는 IP">
          <label>
            <span>IP(hostname): </span>
            <input id='cim-ip' type='input' name='ip' onChange={ this._setValue } defaultValue={ this.state.connection.ip }/>
          </label>
        </div>

        <div className="unit" title="ProObject 프로세스 기동 User">
          <label>
            <span>User: </span>
            <input id='cim-user' type='input' name='user' onChange={ this._setValue } defaultValue={ this.state.connection.user } />
          </label>
        </div>

        <div className="unit" title="Auth 방법">
          <p>
            Authentification Method
          </p>
          <label>
            <input id='cim-authmethod-pwd' type='radio' name="authType" checked onChange={ () => {} }/>
            <span>password</span>
          </label>
          <label>
            <input id='cim-authmethod-key' type='radio' name="authType" disabled/>
            <span>private key</span>
          </label>
        </div>
        <div className="unit" title="비밀번호 입력">
            <label>
              <span> Password </span>
              <input id='cim-auth' type='password' name='pwd' onChange={ this._setValue } onKeyDown= { this._keyDown } defaultValue={ this.state.connection.pwd }/>
            </label>
          </div>
        { afterConnect }
      </div>
    )
  }
}
