import * as http2 from "node:http2";
import { connectNodeAdapter } from "@connectrpc/connect-node";
import { ConnectRouter, HandlerContext } from "@connectrpc/connect";
import { ElizaService } from "./gen/proto/eliza_connect";
import {
  SayRequest,
  SayResponse,
  IntroduceRequest,
} from "./gen/proto/eliza_pb";

const sleep = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const routes = (router: ConnectRouter) =>
  router.service(ElizaService, {
    async say(req: SayRequest, context: HandlerContext) {
      return new SayResponse({
        sentence: `[${Date.now()}] You said ${req.sentence}`,
      });
    },
    async *introduce(req: IntroduceRequest, context: HandlerContext) {
      while (!context.signal.aborted) {
        yield { sentence: `[${Date.now()}] Hi ${req.name}, I'm eliza` };
        await sleep(1000);
      }
    },
  });

http2.createServer(connectNodeAdapter({ routes })).listen(50051);
