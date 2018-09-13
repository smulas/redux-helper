// MIT License

// Copyright (c) 2016-17 (vgmr)

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { Action, Dispatch, MiddlewareAPI, AnyAction } from 'redux';
import { PromiseActionInstance } from './actionTypes'

export interface CheckedPromiseMiddlewareOptions {
    onStart?: (message?: string, action?: Action) => Action;
    onEnd?: (action?: Action) => Action;
    onError?: (error?: any, action?: Action) => Action;
    shouldExecute?: (state: any, action?: Action) => boolean;
}

const _validFunction = (obj: any): obj is Function => {
    return obj && typeof obj === 'function';
}

const _validAction = (object: any): object is Action => {
    return object && object instanceof Object &&
        !(object instanceof Array) &&
        typeof object !== "function" &&
        typeof object.type === "string";
}

const checkedPromiseMiddleware = (options?: CheckedPromiseMiddlewareOptions) => (midlapi: MiddlewareAPI<any>) => (next: Dispatch<AnyAction>) => (action: any) => {
    if (!action || !action.isPromiseAction || !action.payload) return next(action);
    let opts = options || {};
    const {
        checkExecution = false,
        enableProgress = true,
        message = 'loading',
        promiseParams,
        promise = undefined as Promise<any> | undefined,
        resultAction
    } = action.payload;

    if (!promise || typeof promise.then !== 'function' || !_validFunction(resultAction)) {
        return next(action);
    }

    const { dispatch, getState } = midlapi;

    if (checkExecution && _validFunction(opts.shouldExecute) && !opts.shouldExecute(getState(), action)) {
        console.log('discarding action ' + action.type);
        return;
    }

    if (enableProgress && _validFunction(opts.onStart)) {
        const actStart = opts.onStart(message, action);

        if (_validAction(actStart)) {
            Object.assign(actStart, <PromiseActionInstance<any>>{
                promiseActionType: action.type,
                promiseActionEvent: 'OnStart',
                promiseActionMessage: message,
                promiseActionParams: promiseParams
            });
            dispatch(actStart);
        }
    }

    return promise.then(
        (response: any) => {
            if (enableProgress && _validFunction(opts.onEnd)) {
                const actEnd = opts.onEnd(action);
                if (_validAction(actEnd)) {
                    Object.assign(actEnd, <PromiseActionInstance<any>>{
                        promiseActionType: action.type,
                        promiseActionEvent: 'OnEnd',
                        promiseActionParams: promiseParams
                    });
                    dispatch(actEnd);
                }
            }

            const actResult = resultAction(response, promiseParams);
            dispatch(actResult);
        },
        (error: any) => {
            if (_validFunction(opts.onError)) {
                const actError = opts.onError(error, action);
                if (_validAction(actError)) {
                    Object.assign(actError, <PromiseActionInstance<any>>{
                        promiseActionType: action.type,
                        promiseActionEvent: 'OnError',
                        promiseActionError: error,
                        promiseActionParams: promiseParams
                    });
                    dispatch(actError);
                }
            }
        });
}

export default checkedPromiseMiddleware;
