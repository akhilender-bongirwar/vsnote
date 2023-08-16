import * as vscode from 'vscode';
import { apiBaseUrl } from './constants';
import * as polka from 'polka';
import { TokenManager } from './TokenManager';


export const authenticate = () =>{
    const app = polka();
    
    app.get(`/auth/:token`,async (req,res) => {
        const {token} = req.params;
        if(!token){
            res.end(`<h1>Something went wrong!!</h1>`);
            return;
        }
        await TokenManager.setToken(token);
        res.end(`<h1>auth was succesful, you can close this now</h1>`);
        (app as any).server.close();
    });
    
    app.listen(9003, (err:Error) =>{
        if(err){
            vscode.window.showErrorMessage(err.message);
        }else{
            vscode.commands.executeCommand(
                "vscode.open",
                vscode.Uri.parse(`${apiBaseUrl}/auth/github`)
            );
        }
    })
}
    