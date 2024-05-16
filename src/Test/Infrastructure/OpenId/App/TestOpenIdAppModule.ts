import { Module } from "@nestjs/common";
import { ProtectedCatsController } from "./Controller/ProtectedCatsController";
import { TestOpenIdFrontendController } from "./Controller/TestOpenIdFrontendController";

@Module({
  controllers: [TestOpenIdFrontendController, ProtectedCatsController]
})
export class TestOpenIdAppModule { }