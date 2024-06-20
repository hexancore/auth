import { OK, type R } from "@hexancore/common";
import { RedirectResult, type FRequest } from "@hexancore/core";
import { Controller, Get, Header, Req, UseInterceptors } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SessionRequestInjectorInterceptor, type FReqWithSession, type OpenIdUserSessionData } from "../../../../../Infrastructure";

@ApiTags('Test')
@Controller({ path: 'front' })
export class TestOpenIdFrontendController {
  private baseUrl: string;
  public constructor() {
    this.baseUrl = 'https://localhost:3000';
  }

  @Get('protected/dashboard')
  @UseInterceptors(SessionRequestInjectorInterceptor)
  @Header('Content-Type', 'text/html')
  public dashboard(@Req() req: FReqWithSession<OpenIdUserSessionData>): R<string | RedirectResult> {
    const session = req.session;
    const cookiesHtml = req.cookies ? this.renderJsonPreHtml('Cookies', req.cookies) : '';
    if (!session) {
      return this.renderHtml({
        title: 'Dashboard',
        body: `
          <h3 style="text-align:center;">Dashboard</h3>
          <a class="button" href="${this.baseUrl}/user/public/auth/login">Login</a>
          ${cookiesHtml}
        `
      });
    }

    const button = session.isAuthenticated() ? `<a class="button" href="${this.baseUrl}/user/protected/auth/logout">Logout</a>` :
      `<a class="button" href="${this.baseUrl}/user/public/auth/login">Login</a>`;

    const loadCatsScript = `
    <script>
    function loadCats() {
      const response = fetch("${this.baseUrl}/cat/protected/cats", {credentials: "include",}).then((response) => {
        const container = document.getElementById('cats');
        container.innerHTML = '<h4>Cats</h4>';

        response.json().then(data =>
          {
            data.forEach(function(item) {
              let block = document.createElement('div');
              block.innerHTML = \`<p>\${item.id} \${ item.name } - Age: \${item.age}</p>\`;
              block.style.border = "1px solid #ccc";
              block.style.margin = "10px";
              block.style.padding = "10px";
              container.appendChild(block);
          });
        });
      });

    }
    </script>
    `;

    const loadCatsButton = `<button type="button" class="button" onClick="loadCats()">Load cats 😸</button>`;

    const idTokenPayloadHtml = session.isAuthenticated() ? this.renderJsonPreHtml('IdTokenPayload', session.data!.auth!.idToken.getPayload()) : '';
    const dataHtml = session.data ? this.renderJsonPreHtml('Data', session.data.toJSON()) : '';

    return this.renderHtml({
      title: 'Dashboard',
      body: `
        ${loadCatsScript}
        <h3 style="text-align:center;">Dashboard</h3>

        ${button}
        ${loadCatsButton}
        <div id='cats'></div>
        <div>
          <h4>Session</h4>
          <p class="field">Id: <span>${session.id}</span></p>
          <p class="field">State: <span>${session.state}</span></p>
          <p class="field">Created: <span id="sessionCreatedAt">${session.createdAt!.formatDateTime()}Z</span></p>
          <p class="field">Expire: <span id="sessionExpireAt">${session.expireAt!.formatDateTime()}Z</span></p>
          <p class="field">isAuthenticated: <span>${session.isAuthenticated() ? 'Yes' : 'No'}</span></p>
          <p class="field">GroupId: <span>${session.getSessionGroupId()}</span></p>
          ${idTokenPayloadHtml}
          ${dataHtml}
          ${cookiesHtml}
        </div>
        <script>
        convertDateTimeToLocal('sessionCreatedAt');
        convertDateTimeToLocal('sessionExpireAt');
        </script>
      `
    });
  }

  @Get('public/auth-error')
  @Header('Content-Type', 'text/html')
  public authError(@Req() req: FRequest): R<string> {
    const queryHtml = req.query ? this.renderJsonPreHtml('Query', req.query) : '';
    const cookiesHtml = req.cookies ? this.renderJsonPreHtml('Cookies', req.cookies) : '';

    return this.renderHtml({
      title: 'Authorize Error',
      body: `
        <h3 style="text-align:center;">Authorize error</h3>
        <a class="button" href="${this.baseUrl}/user/public/auth/login">Retry Login</a>
        ${queryHtml}
        ${cookiesHtml}
      `
    });
  }

  @Get('public/post-logout')
  @Header('Content-Type', 'text/html')
  public postLogout(@Req() req: FRequest): R<string> {
    const cookiesHtml = req.cookies ? this.renderJsonPreHtml('Cookies', req.cookies) : '';
    return this.renderHtml({
      title: 'Post Logout',
      body: `
        <h3 style="text-align:center;">Post Logout</h3>
        <a class="button" href="${this.baseUrl}/user/public/auth/login">Login</a>
        ${cookiesHtml}
      `
    });
  }

  private renderJsonPreHtml(header: string, data: any): string {
    const text = JSON.stringify(data, null, 2);
    return `
    <p class="field">${header}:</p>
    <pre>${text}</pre>
    `;
  }

  private renderHtml(context: Record<string, any>) {
    return OK(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${context.title}</title>
        <style>
          .container {
            font-family: Verdana;
            font-size: 16px;
            margin: auto;
            width: 80%;
          }
          pre {
            border: solid 1px black;
            padding: 16px;
          }

          p.field {
            font-weight: bold;
          }
          p.field span {
            font-weight: normal;
          }
          .button{
            background: linear-gradient(to right,#196BCA ,#6433E0);
            background-color: #196BCA;
            color: #fff;
            font-family: Verdana;
            font-size: 18px;
            font-weight: 800;
            font-style: normal;
            text-decoration: none;
            padding: 20px 52px;
            border: 0px solid #000;
            border-radius: 7px;
            display: inline-block;
           }
          .button:hover{
            background: linear-gradient(to right,#5482d0 ,#7d5ee3);
            background-color: #5482d0;
          }
          .button:active{
            transform: scale(0.95);
          }

        </style>
        ${context.head ?? ''}
      </head>
      <body>
      <script>
        function convertDateTimeToLocal(spanId) {
          const spanElement = document.getElementById(spanId);
          spanElement.innerText = new Date(spanElement.innerText.trim()).toLocaleString(undefined, {
            dateStyle: 'short',
            timeStyle: 'long'
          });
        }
      </script>
      <div class="container">
      ${context.body.replace(/^ {8}/gm, '')}
      </div>
      </body>
      </html>
    `);
  }
}