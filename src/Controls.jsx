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
      <input value={this.state.name} onChange={this.onChange.bind(this)} />
    );
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
  constructor(emitter, key, text) {
    super(key);
    this.keyz = Math.random()
      .toString(36)
      .substr(2, 9);
    this.emitter = emitter;
    this.type = "Button";
    this.template =
      '<input id="node_short_txt" placeholder="Блюдо" type="text" :value="value_txt" @input="change_txt($event)"/> <button class="node_submit" type="button" @click="change_btn($event)" />{{text}}';

    this.scope = {
      value_text: "",
      text: text,
      change_txt: this.change_txt.bind(this),
      change_btn: this.change_btn.bind(this)
    };
  }

  change_btn(e) {
    let outputs = this.getNode().outputs;

    if (this.scope.value_text !== undefined && this.scope.value_text !== "") {
      this.putData(this.scope.value_text, this.scope.value_text);
      this.getNode().addOutput(
        new Output(this.keyz, this.scope.value_text, stepSocket, true)
      );
      console.log(outputs);
      this.scope.value_text = "";
      this.emitter.trigger("process");
      this.getNode()._alight.scan();
    }
  }

  change_txt(e) {
    this.scope.value_text = e.target.value;
    this.update();
  }

  update() {
    if (this.key) {
      this.putData(this.key, this.scope.value);
    }
    this.emitter.trigger("process");
    this._alight.scan();
  }

  mounted() {}

  setValue(val) {
    this.scope.value = val;
    this._alight.scan();
  }
}

export { stepSocket };
