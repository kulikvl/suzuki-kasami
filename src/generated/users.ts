// Code generated by protoc-gen-ts_proto. DO NOT EDIT.
// versions:
//   protoc-gen-ts_proto  v2.2.7
//   protoc               v3.19.1
// source: users.proto

/* eslint-disable */
import { BinaryReader, BinaryWriter } from "@bufbuild/protobuf/wire";
import { type CallContext, type CallOptions } from "nice-grpc-common";

export const protobufPackage = "users";

export enum UserStatus {
  UNKNOWN = 0,
  OFFLINE = 1,
  BUSY = 2,
  AVAILABLE = 3,
  UNRECOGNIZED = -1,
}

export function userStatusFromJSON(object: any): UserStatus {
  switch (object) {
    case 0:
    case "UNKNOWN":
      return UserStatus.UNKNOWN;
    case 1:
    case "OFFLINE":
      return UserStatus.OFFLINE;
    case 2:
    case "BUSY":
      return UserStatus.BUSY;
    case 3:
    case "AVAILABLE":
      return UserStatus.AVAILABLE;
    case -1:
    case "UNRECOGNIZED":
    default:
      return UserStatus.UNRECOGNIZED;
  }
}

export function userStatusToJSON(object: UserStatus): string {
  switch (object) {
    case UserStatus.UNKNOWN:
      return "UNKNOWN";
    case UserStatus.OFFLINE:
      return "OFFLINE";
    case UserStatus.BUSY:
      return "BUSY";
    case UserStatus.AVAILABLE:
      return "AVAILABLE";
    case UserStatus.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}

export interface User {
  id: number;
  name: string;
  age: number;
  status: UserStatus;
}

export interface UserRequest {
  id: number;
}

function createBaseUser(): User {
  return { id: 0, name: "", age: 0, status: 0 };
}

export const User: MessageFns<User> = {
  encode(message: User, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.id !== 0) {
      writer.uint32(8).int32(message.id);
    }
    if (message.name !== "") {
      writer.uint32(18).string(message.name);
    }
    if (message.age !== 0) {
      writer.uint32(24).int32(message.age);
    }
    if (message.status !== 0) {
      writer.uint32(32).int32(message.status);
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): User {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUser();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: {
          if (tag !== 8) {
            break;
          }

          message.id = reader.int32();
          continue;
        }
        case 2: {
          if (tag !== 18) {
            break;
          }

          message.name = reader.string();
          continue;
        }
        case 3: {
          if (tag !== 24) {
            break;
          }

          message.age = reader.int32();
          continue;
        }
        case 4: {
          if (tag !== 32) {
            break;
          }

          message.status = reader.int32() as any;
          continue;
        }
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skip(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): User {
    return {
      id: isSet(object.id) ? globalThis.Number(object.id) : 0,
      name: isSet(object.name) ? globalThis.String(object.name) : "",
      age: isSet(object.age) ? globalThis.Number(object.age) : 0,
      status: isSet(object.status) ? userStatusFromJSON(object.status) : 0,
    };
  },

  toJSON(message: User): unknown {
    const obj: any = {};
    if (message.id !== 0) {
      obj.id = Math.round(message.id);
    }
    if (message.name !== "") {
      obj.name = message.name;
    }
    if (message.age !== 0) {
      obj.age = Math.round(message.age);
    }
    if (message.status !== 0) {
      obj.status = userStatusToJSON(message.status);
    }
    return obj;
  },

  create(base?: DeepPartial<User>): User {
    return User.fromPartial(base ?? {});
  },
  fromPartial(object: DeepPartial<User>): User {
    const message = createBaseUser();
    message.id = object.id ?? 0;
    message.name = object.name ?? "";
    message.age = object.age ?? 0;
    message.status = object.status ?? 0;
    return message;
  },
};

function createBaseUserRequest(): UserRequest {
  return { id: 0 };
}

export const UserRequest: MessageFns<UserRequest> = {
  encode(message: UserRequest, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.id !== 0) {
      writer.uint32(8).int32(message.id);
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): UserRequest {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUserRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: {
          if (tag !== 8) {
            break;
          }

          message.id = reader.int32();
          continue;
        }
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skip(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): UserRequest {
    return { id: isSet(object.id) ? globalThis.Number(object.id) : 0 };
  },

  toJSON(message: UserRequest): unknown {
    const obj: any = {};
    if (message.id !== 0) {
      obj.id = Math.round(message.id);
    }
    return obj;
  },

  create(base?: DeepPartial<UserRequest>): UserRequest {
    return UserRequest.fromPartial(base ?? {});
  },
  fromPartial(object: DeepPartial<UserRequest>): UserRequest {
    const message = createBaseUserRequest();
    message.id = object.id ?? 0;
    return message;
  },
};

export type UsersDefinition = typeof UsersDefinition;
export const UsersDefinition = {
  name: "Users",
  fullName: "users.Users",
  methods: {
    getUser: {
      name: "GetUser",
      requestType: UserRequest,
      requestStream: false,
      responseType: User,
      responseStream: false,
      options: {},
    },
  },
} as const;

export interface UsersServiceImplementation<CallContextExt = {}> {
  getUser(request: UserRequest, context: CallContext & CallContextExt): Promise<DeepPartial<User>>;
}

export interface UsersClient<CallOptionsExt = {}> {
  getUser(request: DeepPartial<UserRequest>, options?: CallOptions & CallOptionsExt): Promise<User>;
}

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}

export interface MessageFns<T> {
  encode(message: T, writer?: BinaryWriter): BinaryWriter;
  decode(input: BinaryReader | Uint8Array, length?: number): T;
  fromJSON(object: any): T;
  toJSON(message: T): unknown;
  create(base?: DeepPartial<T>): T;
  fromPartial(object: DeepPartial<T>): T;
}
