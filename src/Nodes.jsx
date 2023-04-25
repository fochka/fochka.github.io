import React from "react";
import { Node, Socket, Control } from "rete-react-render-plugin";
import { Selector } from "./custumComponents"

export class StepNode extends Node {
  
  onClick(output) {
    const name = JSON.parse(output.name);
    if (name.formula) return;
    name.value = prompt('',  name.value);
    if (name.value === null) return
    if (name.value === '') {
      if(!window.confirm(`Удалить ответ ${output.name.value} на шаге ${output.node.name}?`)) return;
      output.node.outputs.delete(output.key)
    };
    output.name = JSON.stringify(name);
    output.node.update();
  }

  render() {
    const { node, bindSocket, bindControl } = this.props;
    const { outputs, controls, inputs, selected } = this.state;

    return (
      <div className={`node ${selected}`}>
        {/* Inputs */}
        {inputs.map(input => (
          <div className="input" key={input.key}>
            <Socket
              type="input"
              socket={input.socket}
              io={input}
              innerRef={bindSocket}
            />
            {!input.showControl() && (
              <div className="input-title">{input.name}</div>
            )}
            {input.showControl() && (
              <Control
                className="input-control"
                control={input.control}
                innerRef={bindControl}
              />
            )}
          </div>
        ))}
        <div className="title">{node.name}</div>
        {/* Controls */}
        {controls.map(control => (
          <Control
            className="control"
            key={control.key}
            control={control}
            innerRef={bindControl}
          />
        ))}
        {/* Outputs */}
        <div>
        {outputs.map((output, key) => (
          <Selector
            output={output}
            outputKey={output.key}
            innerRef={bindSocket}
          />
        ))
        
        
        /*outputs.map(output => (
          <div className="output" key={output.key}>
            <div className="output-title" onClick={() => this.onClick(output)} >{
              JSON.parse(output.name).value || ''
            }</div>
            <Socket
              type="output"
              socket={output.socket}
              io={output}
              innerRef={bindSocket}
            />
            <Selector/>
          </div>
        ))*/}
        </div>
      </div>
    );
  }
}

