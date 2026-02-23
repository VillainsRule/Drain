import { useState, useCallback, useRef, useEffect } from 'react';

import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Input } from '@/components/shadcn/input';

type DialogType = 'alert' | 'confirm' | 'prompt' | 'copy';

interface IInput {
    placeholder: string;
    maxLength: number | undefined;
    minLength: number | undefined;
}

interface DialogState {
    open: boolean;
    type: DialogType | null;
    title: string;
    body: string;
    inputs: IInput[];
    copyValue: string;
    onConfirm: (() => void) | ((value: string) => void) | null;
    onCancel: (() => void) | null;
    error: string | null;
}

let _setState: ((state: DialogState | ((prev: DialogState) => DialogState)) => void) | null = null;

const defaultState: DialogState = {
    open: false,
    type: null,
    title: '',
    body: '',
    inputs: [],
    copyValue: '',
    onConfirm: null,
    onCancel: null,
    error: null,
};

const handleInputs = (inputs: (string | IInput)[]) =>
    inputs.map((input) => typeof input === 'string' ? { placeholder: input, maxLength: undefined, minLength: undefined } : input);

export class shadd {
    /**
     * alerts with a simple message and an OK button
     * @param title the alert title
     * @param body the alert body
     */
    static alert(title: string, body: string): void {
        _setState?.({ ...defaultState, open: true, type: 'alert', title, body });
    }

    /**
     * confirms an action
     * @param title the confirmation title
     * @param body the confirmation body
     * @param onConfirm callback on confirm
     * @param onCancel callback on cancel/close
     */
    static confirm(
        title: string,
        body: string,
        onConfirm?: () => void,
        onCancel?: () => void
    ): void {
        _setState?.({
            ...defaultState,
            open: true,
            type: 'confirm',
            title,
            body,
            onConfirm: onConfirm ?? null,
            onCancel: onCancel ?? null,
        });
    }

    /**
     * prompts for text input
     * @param title the prompt title
     * @param body the prompt body
     * @param inputs input field config(s)
     * @param onConfirm callback on confirm (input value as argument)
     * @param onCancel callback on cancel
     */
    static prompt(
        title: string,
        body: string,
        inputs: string | string[] | IInput | IInput[],
        onConfirm?: (value: string) => void,
        onCancel?: () => void
    ): void {
        _setState?.({
            ...defaultState,
            open: true,
            type: 'prompt',
            title,
            body,
            inputs: handleInputs(Array.isArray(inputs) ? inputs : [inputs]),
            onConfirm: onConfirm ?? null,
            onCancel: onCancel ?? null,
        });
    }

    /**
     * displays a readonly input for copying a value
     * @param title the dialog title
     * @param body the dialog body
     * @param value the readonly value to display
     * @param onCancel callback on cancel/close
     */
    static copy(
        title: string,
        body: string,
        value: string,
        onCancel?: () => void
    ): void {
        _setState?.({
            ...defaultState,
            open: true,
            type: 'copy',
            title,
            body,
            copyValue: value,
            onCancel: onCancel ?? null,
        });
    }

    static setError(message: string): void {
        _setState?.((prev) => ({ ...prev, error: message }));
    }

    static close(): void {
        _setState?.({ ...defaultState, open: false });
    }
}

export function ShaddProvider() {
    const [state, setState] = useState<DialogState>(defaultState);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (state.open && (state.type === 'prompt' || state.type === 'copy')) {
            const frame = requestAnimationFrame(() => inputRef.current?.focus());
            return () => cancelAnimationFrame(frame);
        }
    }, [state.open, state.type]);

    _setState = useCallback((next: DialogState | ((prev: DialogState) => DialogState)) => {
        setState((prev) => {
            const nextState = typeof next === 'function' ? next(prev) : next;
            if (typeof next !== 'function') setInputValue('');
            return nextState;
        });
    }, []);

    const close = useCallback(() => {
        setState((s) => ({ ...s, open: false, error: null }));
    }, []);

    const handleConfirm = useCallback(() => {
        if (state.type === 'prompt') (state.onConfirm as ((value: string) => void) | null)?.(inputValue);
        else (state.onConfirm as (() => void) | null)?.();
    }, [state, inputValue]);

    const handleCancel = useCallback(() => {
        close();
        state.onCancel?.();
    }, [close, state]);

    const hasInput = state.type === 'prompt' || state.type === 'copy';

    return (
        <Dialog open={state.open} onOpenChange={(open) => !open && handleCancel()}>
            <DialogContent className='sm:max-w-lg gap-2'>
                <DialogHeader>
                    <DialogTitle>{state.title}</DialogTitle>
                    {state.body && <DialogDescription>{state.body}</DialogDescription>}
                </DialogHeader>

                {hasInput && (
                    <div className='flex flex-col py-2 gap-2'>
                        {state.type === 'prompt' && state.inputs.map((input, idx) => (<Input
                            ref={idx === 0 ? inputRef : undefined}
                            key={idx}
                            placeholder={input.placeholder}
                            minLength={input.minLength}
                            maxLength={input.maxLength}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                        />))}

                        {state.type === 'copy' && (<Input
                            ref={inputRef}
                            readOnly
                            value={state.copyValue}
                            onFocus={(e) => e.target.select()}
                        />)}
                    </div>
                )}

                {state.error && <div className='text-sm text-red-500 mb-1'>{state.error}</div>}

                <DialogFooter className={hasInput ? 'gap-3 pt-1' : 'gap-3'}>
                    {state.type === 'alert' && <Button onClick={close}>OK</Button>}

                    {state.type === 'confirm' && <>
                        <Button variant='outline' onClick={handleCancel}>Cancel</Button>
                        <Button onClick={handleConfirm}>Confirm</Button>
                    </>}

                    {state.type === 'prompt' && <>
                        <Button variant='outline' onClick={handleCancel}>Cancel</Button>
                        <Button onClick={handleConfirm}>Submit</Button>
                    </>}

                    {state.type === 'copy' && (
                        <Button onClick={close}>Close</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

(window as any).shadd = shadd;