import { Router, Request, Response } from 'express';
import * as session from 'express-session'
import * as bodyParser from 'body-parser'
import { WebApi, getPersonalAccessTokenHandler } from 'azure-devops-node-api';
import { Operation } from 'azure-devops-node-api/interfaces/common/VSSInterfaces';

const router: Router = Router();
let uri: string;
let token: string;
let project: string;

let api: WebApi;

router.use(session({
    secret: 'vstsSession',
    resave: false,
    saveUninitialized: false
}))
router.use(bodyParser.json({ limit: '50mb' }));
router.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));

function errorHandler(res: Response, code: number, type: string, message: string) {
    res.contentType('application/json').status(code).send({
        errorType: type,
        message: message
    });
}

function connect(req: any, res: Response) {
    uri = req.body.uri;
    token = req.body.token;
    project = req.body.project;

    if (!uri || !token)
        return res.status(401).send({
            message: "Personal Access Token and Project URL is required!"
        });

    api = new WebApi(uri, getPersonalAccessTokenHandler(token));
}

router.post('/login', (req: any, res: Response) => {
    connect(req, res);
    api.connect().then(() => {
        req.session.uri = uri;
        req.session.token = token;
        res.contentType('application/json').status(200).send();
    }, () => {
        errorHandler(res, 401, "authentication", "Unauthorized")
    });
});

router.post('/witTypes', (req: any, res: Response) => {
    connect(req, res);
    api.getWorkItemTrackingApi().then(witApi => {
        witApi.getWorkItemTypes(project).then(witTypes => {
            res.contentType('application/json').status(200)
                .send(witTypes);
        })
    }, () => {
        errorHandler(res, 409, "witTypes", "getWorkItemTrackingApi")
    });
});

router.post('/wit/:witId', (req: Request, res: Response) => {
    connect(req, res);
    api.getWorkItemTrackingApi().then(witApi => {
        witApi.getWorkItem(parseInt(req.params.witId)).then(wit => {
            res.contentType('application/json').status(200)
                .send(wit);
        })
    }, () => {
        errorHandler(res, 409, "wit", "getWorkItem")
    });
});

router.post('/wit', (req: any, res: Response) => {
    connect(req, res);

    let areaPath = req.body.ticketRQ.fields[1].value;
    let iterationPath = req.body.ticketRQ.fields[0].value;
    let tags = req.body.ticketRQ.fields[3].value;
    let testItemId = req.body.executionId;
    let testItemName = req.body.executionName;
    let testItemDescription = req.body.executionDescription;
    let backLink = req.body.ticketRQ.backLinks[`${testItemId}`];

    let workItemFields = [
        {
            op: Operation.Add,
            path: "/fields/System.Title",
            from: null,
            value: `Test Automation Error: ${testItemName}`
        },
        {
            op: Operation.Add,
            path: "/fields/Microsoft.VSTS.TCM.ReproSteps",
            from: null,
            value: `Detalhes em: ${backLink}`
        },
        {
            op: Operation.Add,
            path: "/fields/Microsoft.VSTS.TCM.SystemInfo",
            from: null,
            value: `${testItemDescription}`
        },
        {
            op: Operation.Add,
            path: "/fields/System.AreaPath",
            from: null,
            value: `${areaPath}`
        },
        {
            op: Operation.Add,
            path: "/fields/System.IterationPath",
            from: null,
            value: `${iterationPath}`
        },
        {
            op: Operation.Add,
            path: "/fields/System.Tags",
            from: null,
            value: `${tags}`
        }
    ];

    api.getWorkItemTrackingApi().then(witApi => {
        witApi.createWorkItem({}, workItemFields, project, "Bug").then(wit => {
            res.contentType('application/json').status(200)
                .send({
                    id: wit.id,
                    summary: wit.fields["Microsoft.VSTS.TCM.SystemInfo"],
                    status: wit.fields['System.State'],
                    ticketUrl: wit._links.html.href
                });
        })
    }, () => {
        errorHandler(res, 409, "wit", "createWorkItem")
    });
});



export const VstsController: Router = router;