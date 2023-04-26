import React from "react";
import { Socket } from "rete-react-render-plugin";

export class Selector extends React.Component {
    state = { isOpen: false, outName: JSON.parse(this.props.output.name || {}).value || '', readOnly: false }
        
    handleClick = e => {
      if (!this.state.readOnly)
        this.setState({ isOpen: true })
    }
    handleBlur = (e) => {
      if (!e.currentTarget.value) return;
      this.state.outName = e.currentTarget.value;
      const obj = JSON.parse(this.props.output.name);
      obj.value = e.currentTarget.value;
      this.props.output.name = JSON.stringify(obj);
      this.props.output.key = JSON.stringify(obj);
      this.props.output.node.outputs.delete(this.props.outputKey);
      this.props.output.node.outputs.set(this.props.output.key, this.props.output);
      this.props.output.node.update();
      this.setState({ isOpen: false });
    }
  
    render() {
      const { isOpen } = this.state; 
      const name = JSON.parse(this.props.output.name || {});
      if (name && name.formula) this.state.readOnly = true;
  
      return (
        <div>
          <div className="output" key={ this.props.output.key }>
            <div className="output-title" onClick = { this.handleClick }>
              {!isOpen && this.state.outName }
              {isOpen && <input type="text" list="items" placeholder={this.state.outName}  onBlur = { this.handleBlur }  tabIndex = { 0 }/> } 
              <Socket
                type="output"
                socket={this.props.output.socket}
                io={this.props.output}
                innerRef={this.props.innerRef}
              /> 
              <datalist id="items">
                {global.ss.items.map((item) => 
                  <option value={item.name} key={item.name}>{item.name}</option>
                )}
              </datalist>            
            </div>
          </div>
        </div>
      )
    }
  }