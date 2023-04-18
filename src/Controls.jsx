import React from "react";
import { Control, Output, Socket} from "rete";

var stepSocket = new Socket("Соединить с другим шагом");

class MyReactControl extends React.Component {
  state = {};
  componentDidMount() {
    this.setState({
      name: this.props.name
    });
    //console.log(this.props);
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
      <input value={this.state.name} readOnly/* onChange={this.onChange.bind(this)}*/ />
    );
  }
}

class InvisibleComponent extends React.Component {
  state = {};
  componentDidMount() {
    this.setState({
      name: this.props.name
    });
    this.props.putData(this.props.id, this.props.name);
  }
  onChange(event) {
    this.props.putData(this.props.id, event.target.value);
    this.setState({
      name: event.target.value
    });
  }

  render() {
    return (<b/>);
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
    const text = JSON.stringify({ value: 'answer' + (node.outputs.size + 1)});
    if(node){
      node.addOutput(
        new Output(text, text, stepSocket, false)
      );
      node.update();
    }
  }

  render() {
    return (
      <div className="right_div">
        <button type="button" className="node_submit" onClick={this.onClick.bind(this)}>+</button>
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
      <a href={this.state.name} target="_blank" rel="noopener noreferrer">"Перейти к таблице"</a>
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

export class InvisibleControl extends Control {
  constructor(emitter, key, name) {
    super(key);
    this.render = "react";
    this.component = InvisibleComponent;
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
