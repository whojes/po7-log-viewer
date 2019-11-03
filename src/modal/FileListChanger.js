import React from "react";

import Cookies from "js-cookie";
import Select from "react-dropdown-select";
import "./FileListChanger.css";

export default class FileListChanger extends React.Component  {
  constructor() {
    super();
    this.state = {
      existLogFileList: [],
      fileList: [],
      save: Cookies.get("fileList.save") === "true",
    }
    this.connectionInfoSaved = Cookies.get("connection.save") === "true"
  }

  static getDerivedStateFromProps (props, state) {
    return {
      existLogFileList: props.existLogFileList
    }
  }

  componentDidMount() {
    if(this.state.fileList.length === 0 && this.props.fileList.length !== 0){
      this.setState({
        fileList: this.props.fileList
      });
    }
  }

  componentDidUpdate() {
    if(this.state.fileList.length === 0 && this.props.fileList.length !== 0){
      this.setState({
        fileList: this.props.fileList
      });
    }
  }

  _applyAndClose = () => {
    this.props.changeParent.setState({
      fileList: this.state.fileList,
      modalIsOpen: false,
    });
    
    if( this.state.save ) {
      Cookies.set("fileList.save", true);
      Cookies.set("fileList.file", this.state.fileList.join(":"));
    } else {
      Cookies.set("fileList.save", false);
      Cookies.set("fileList.file", "");
    }
  }

  _changeConnectionInfo = () => {
    this.props.changeParent.setState({
      modalIsOpen: false,
      isConnected: false,
      connection: {}
    });
  }

  _addFile = (values) => {
    this.props.alert.show(`Add ${values[0].value.split("/").pop()} to file list`);
    this.props.changeParent.setState({
      fileList: this.state.fileList.concat(values[0].value)
    });
    this.setState({
      fileList: this.state.fileList.concat(values[0].value)
    });
  }

  render() {
    return (
      <div id="file-list-changer-modal">
        <div>
          <p> Connected Server: <b>{ `${this.props.connection.user}@${this.props.connection.ip}:${this.props.connection.poDirectory}` }</b></p>
        </div>
        <div className="exist-file-list">
          {/* SelectBox */}
          {/* regex를 잘하게되면 수정할것 */}
          <Select options={ this.state.existLogFileList.filter(elem => !/\d\d\d\d/.test(elem.split("/").pop()) ).map((elem, i) => {
              let val = {
                key: i, 
                label: elem.replace(this.props.connection.poDirectory + "/logs/", ""), 
                value: elem,
                disabled: this.state.fileList.includes(elem),
              }
              return val;         
            }) }
            onChange={ (values) => this._addFile(values) } disabledLabel="Selected" clearOnSelect addPlaceholder="<= 이거 안지워져 ㅠㅠ 그냥 여기서 검색          ">
          </Select>
        </div>
        <div className="file-list">
          <p> Following files, Click to remove </p>
          {
            this.state.fileList.map((elem, i) => {
              return (
                <button key={ i } title={ elem } className="file-list-button" onClick={ () => {
                  let deletedList = this.state.fileList;
                  let index = deletedList.indexOf(elem);
                  if (this.props.trackingFileList[elem] !== undefined) {
                    alert(`You can't remove tracking file ${elem.split("/").pop()}. Untrack it and try again.`);
                    return;
                  }
                  deletedList.splice(index, 1);
                  this.props.alert.show(`Remove ${elem.split("/").pop()} from file list`);
                  this.setState({
                    fileList: deletedList
                  });
                  this.props.changeParent.setState({
                    fileList: deletedList
                  });
                }}>
                  { elem.split("/").pop() }
                </button>
              )
            })
          }
        </div>

        <div className="save" title="차가운 아메리카노 한 잔 주세요.">
          <label>
            <span>파일 리스트 저장</span>
            <input id='flc-user' type='checkbox' onChange={ (event) => this.setState({save: event.target.checked}) } defaultChecked={ this.state.save } 
              disabled={ !this.connectionInfoSaved } title="Can use when connection info saved"/>
          </label>
          <button type="submit" onClick={ this._applyAndClose }>Apply and Close</button>
        </div>
      </div>
    )
  }
}
