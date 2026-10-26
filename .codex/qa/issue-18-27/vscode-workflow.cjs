const vscode=require('vscode'), fs=require('fs'), path=require('path'), assert=require('assert/strict');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
exports.run=async()=>{
 const workDir=process.env.OTAK_QA_DIR;
 if(!workDir) throw new Error('OTAK_QA_DIR is required');
 const report={environment:{vscode:vscode.version,node:process.version,platform:process.platform},tests:[]};
 const check=async(id,run)=>{try{await run();report.tests.push({id,passed:true});}catch(error){report.tests.push({id,passed:false,error:String(error)});}};
 try{
  await vscode.extensions.getExtension('odangoo.otak-lsp').activate();
  const uri=vscode.Uri.file(path.join(workDir,'vscode-workspace','sample.md'));
  const document=await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  await check('C18-command-noarg',async()=>{
   const cancel=setTimeout(()=>{void vscode.commands.executeCommand('workbench.action.closeQuickOpen');},1200);
   try{await vscode.commands.executeCommand('otakLsp.setTheme');}finally{clearTimeout(cancel);}
  });
  await check('C20-toggle-preserves-partial-config-and-global',async()=>{
   const config=()=>vscode.workspace.getConfiguration('otakLsp',uri);
   assert.equal(config().get('enableGrammarCheck'),true);
   assert.equal(config().get('enableSemanticHighlight'),false);
   const before={grammar:config().inspect('enableGrammarCheck').globalValue,semantic:config().inspect('enableSemanticHighlight').globalValue};
   await vscode.commands.executeCommand('otakLsp.toggle');
   assert.equal(config().get('enableGrammarCheck'),false);
   assert.equal(config().get('enableSemanticHighlight'),false);
   await vscode.commands.executeCommand('otakLsp.toggle');
   assert.equal(config().get('enableGrammarCheck'),true);
   assert.equal(config().get('enableSemanticHighlight'),false);
   assert.deepEqual({grammar:config().inspect('enableGrammarCheck').globalValue,semantic:config().inspect('enableSemanticHighlight').globalValue},before);
  });
  await check('C22-theme-scope-isolation',async()=>{
   await vscode.commands.executeCommand('otakLsp.setTheme','nature');
   const inspect=vscode.workspace.getConfiguration('editor',uri).inspect('semanticTokenColorCustomizations');
   assert.equal(inspect.globalValue?.rules?.function,undefined,'workspace-only rule must not be copied to global');
   assert.equal(inspect.workspaceValue?.rules?.function,'#abcdef','unmanaged workspace rule must remain');
  });
  await check('C20-shared-workspace-owner-across-documents',async()=>{
   const secondUri=vscode.Uri.file(path.join(workDir,'vscode-workspace','second.md'));
   fs.writeFileSync(secondUri.fsPath,'私はは学校に行きます。');
   await vscode.window.showTextDocument(document);
   await vscode.commands.executeCommand('otakLsp.toggle');
   const second=await vscode.workspace.openTextDocument(secondUri);
   await vscode.window.showTextDocument(second);
   try{
    await vscode.commands.executeCommand('otakLsp.toggle');
    const current=vscode.workspace.getConfiguration('otakLsp',secondUri);
    assert.equal(current.get('enableGrammarCheck'),true);
    assert.equal(current.get('enableSemanticHighlight'),false,'shared scope must restore the original grammar-only pair');
   }finally{
    const reset=vscode.workspace.getConfiguration('otakLsp',uri);
    await reset.update('enableGrammarCheck',true,vscode.ConfigurationTarget.Workspace);
    await reset.update('enableSemanticHighlight',false,vscode.ConfigurationTarget.Workspace);
    await vscode.window.showTextDocument(document);
   }
  });
  await check('C21-C24-real-language-server-diagnostic-and-quickfix',async()=>{
   await vscode.commands.executeCommand('otakLsp.analyzeCurrentFile');
   let diagnostic;
   for(let i=0;i<80;i++){
    diagnostic=vscode.languages.getDiagnostics(uri).find(d=>d.code==='double-particle');
    if(diagnostic)break;
    await delay(100);
   }
   assert(diagnostic,'manual command must reach actual parser and publish double-particle');
   const actions=await vscode.commands.executeCommand('vscode.executeCodeActionProvider',uri,diagnostic.range);
   const action=actions.find(a=>a.edit&&a.title.includes('double-particle'));
   assert(action,'server must offer scoped suppression edit');
   assert(await vscode.workspace.applyEdit(action.edit));
   assert(document.getText().includes('otak-lsp-disable-line double-particle'));
   await vscode.commands.executeCommand('otakLsp.analyzeCurrentFile');
   for(let i=0;i<80&&vscode.languages.getDiagnostics(uri).some(d=>d.code==='double-particle');i++)await delay(100);
   assert(!vscode.languages.getDiagnostics(uri).some(d=>d.code==='double-particle'),'applied edit must suppress actual diagnostic');
  });
  await check('C20-multi-root-isolation',async()=>{
   const otherUri=vscode.Uri.file(path.join(workDir,'other-workspace','other.md'));
   const other=await vscode.workspace.openTextDocument(otherUri);
   await vscode.window.showTextDocument(other);
   const before=vscode.workspace.getConfiguration('otakLsp',otherUri);
   assert.equal(before.get('enableGrammarCheck'),false);
   assert.equal(before.get('enableSemanticHighlight'),false);
   await vscode.commands.executeCommand('otakLsp.toggle');
   const after=vscode.workspace.getConfiguration('otakLsp',otherUri);
   assert.equal(after.get('enableGrammarCheck'),true);
   assert.equal(after.get('enableSemanticHighlight'),true);
   assert.equal(after.inspect('enableSemanticHighlight').workspaceFolderValue,true);
   const first=vscode.workspace.getConfiguration('otakLsp',uri);
   assert.equal(first.get('enableGrammarCheck'),true);
   assert.equal(first.get('enableSemanticHighlight'),false,'別フォルダーの設定を変更しない');
  });
 }catch(error){report.infrastructureError=String(error);}
 fs.writeFileSync(path.join(workDir,'vscode-workflow-result.json'),JSON.stringify(report,null,2));
 if(report.infrastructureError||report.tests.some(t=>!t.passed))throw new Error(JSON.stringify(report));
};
