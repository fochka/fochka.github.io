import React from "react";
import { Control, Output, Socket} from "rete";

var stepSocket = new Socket("Соединить с другим шагом");

class MyReactControl extends React.Component {
  state = {};
  componentDidMount() {
    this.setState({
      name: this.props.name
    });
    console.log(this.props);
    this.props.putData(this.props.id, this.props.name);
  }
  onChange(event) {
    this.props.putData(this.props.id, event.target.value);
    //this.props.emitter.trigger("process");
    this.setState({
      name: event.target.value
    });
  }

  render() {
    return (
      //<textarea readOnly>{this.state.name}</textarea>
      <input value={this.state.name} readonly/* onChange={this.onChange.bind(this)}*/ />
    );
  }
}

class ButtonComponent extends React.Component {
  state = {};
  componentDidMount() {
    this.setState({
      name: this.props.name
    });
  }
  onClick(event) {
    const node = this.props.emitter.nodes.find(x => {return this.props.name === x.name})
    if(node){
      node.addOutput(
        new Output('answer' + (node.outputs.size + 1), 'answer' + (node.outputs.size + 1), stepSocket, false)
      );
      node.update();
    }
  }

  render() {
    return (
      <div class="right_div">
        <button class="node_submit" type="button" onClick={this.onClick.bind(this)}>+</button>
      </div>
    );
  }
}

class HrefComponent extends React.Component {
  state = {};
  componentDidMount() {
    this.setState({
      name: this.props.name
    });
  }

  render(){
    return (
      <a href={this.state.name}>"Перейти к таблице"</a>
    );

  }
}

export class HrefControl extends Control {
  constructor(emitter, key, name) {
    super(key);
    this.render = "react";
    this.component = HrefComponent;
    this.props = {
      emitter,
      id: key,
      name,
      //putData: () => this.putData.apply(this, arguments)
    };
  }
}

export class TextControl extends Control {
  constructor(emitter, key, name) {
    super(key);
    this.render = "react";
    this.component = MyReactControl;
    this.props = {
      emitter,
      id: key,
      name,
      putData: () => this.putData.apply(this, arguments)
    };
  }
}

export class ButtonControl extends Control {
  constructor(emitter, key, name) {
    super(key);
    this.render = "react";
    this.component = ButtonComponent;
    this.props = {
      emitter,
      id: key,
      name,
      //putData: () => this.putData.apply(this, arguments)
    };
  }
}

export { stepSocket };
