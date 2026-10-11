// Mount the existing App panel in a standalone page. The same compilePreview
// runs in the local Node host; no App service or world mutation is involved.
window.__ModuleLoader__ = {
  load({factory}) {
    const {Panel} = factory(name => {
      if (name === 'react') return window.React;
      throw new Error(`网页没有声明此模块：${name}`);
    });
    const ctx = {connection: {rpc: {async call(_endpoint, _method, {args}) {
      const response = await fetch('/api/compile', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(args.input)
      });
      return response.json();
    }}}};
    window.ReactDOM.createRoot(document.getElementById('root')).render(
      window.React.createElement(Panel, {ctx})
    );
  }
};
