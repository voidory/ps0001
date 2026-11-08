import React from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource-variable/dm-sans';
import 'katex/dist/katex.min.css';
import './style.css';
import App from './App';
class Boundary extends React.Component<React.PropsWithChildren,{error:string}>{state={error:''};static getDerivedStateFromError(error:Error){return {error:error.message};}render(){return this.state.error?<main><h1>LoopLab could not render</h1><p role="alert">{this.state.error}</p><button onClick={()=>location.reload()}>Reload saved work</button></main>:this.props.children;}}
createRoot(document.getElementById('root')!).render(<Boundary><App/></Boundary>);
