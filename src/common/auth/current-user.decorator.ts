import {
  createParamDecorator,
  ExecutionContext,
} from "@nestjs/common";
import type { Request } from "express";
import type { AuthUser } from "./auth-user.type";

type AuthenticatedRequest = Request & {
  authUser?: AuthUser;
};

export const CurrentUser = createParamDecorator(
  (
    _data: unknown,
    context: ExecutionContext,
  ): AuthUser => {
    const request =
      context
        .switchToHttp()
        .getRequest<AuthenticatedRequest>();

    if (!request.authUser) {
      throw new Error(
        "No existe usuario autenticado en la request",
      );
    }

    return request.authUser;
  },
);
