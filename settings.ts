import { html } from './utils';
import { togglePause } from './game';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { get } from 'http';

export abstract class SettingsOption<T> {
    element: DocumentFragment;
    domElement: HTMLElement | null = null;

    constructor(
        public id: string,
        public name: string,
        public defaultValue: T
    ) {
        this.id = id.replace(/[^a-zA-Z0-9]/g, '_'); // Sanitize ID to be valid HTML ID
    }

    setElement() {
        this.element = this.generateHtml();
    }

    // Get input element from either fragment or DOM
    protected getInputElement(): HTMLInputElement | null {
        if (this.domElement) {
            // If already in DOM, find within the document
            return document.getElementById(this.id) as HTMLInputElement;
        } else {
            // If not yet in DOM, find within the fragment
            return this.element.getElementById(this.id) as HTMLInputElement;
        }
    }

    abstract onChange(fn: (value: T) => void): void;
    abstract getValue(): T;
    abstract setValue(value: T): void;
    abstract generateHtml(): DocumentFragment;
}

export class BooleanOption extends SettingsOption<boolean> {
    constructor(id: string, name: string, defaultValue: boolean) {
        super(id, name, defaultValue);
        this.setElement();
    }

    onChange(fn: (value: boolean) => void): void {
        const checkbox = this.getInputElement();
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                fn(checkbox.checked);
            });
        }
    }

    getValue(): boolean {
        const checkbox = this.getInputElement();
        return checkbox ? checkbox.checked : this.defaultValue;
    }

    setValue(value: boolean): void {
        const checkbox = this.getInputElement();
        if (checkbox) {
            checkbox.checked = value;
        }
    }

    generateHtml(): DocumentFragment {
        return html` <label for="${this.id}" class="settings-toggle">
            <div class="toggle-switch">
                <input
                    type="checkbox"
                    id="${this.id}"
                    value="${this.defaultValue}"
                />
                <span class="toggle-slider"></span>
            </div>
            ${this.name}</label>`;
    }
}

export class NumberOption extends SettingsOption<number> {
    constructor(
        id: string,
        name: string,
        defaultValue: number,
        public min: number,
        public max: number,
        public step: number = 1
    ) {
        super(id, name, defaultValue);
        this.setElement();
    }

    onChange(fn: (value: number) => void): void {
        const input = this.getInputElement();
        if (input) {
            input.addEventListener('input', () => {
                fn(Number(input.value));
            });
        }
    }

    getValue(): number {
        const input = this.getInputElement();
        return input ? Number(input.value) : this.defaultValue;
    }

    setValue(value: number): void {
        const input = this.getInputElement();
        if (input) {
            input.value = String(value);
        }
    }

    generateHtml(): DocumentFragment {
        return html`<div class="settings-input">
            <input
                type="number"
                id="${this.id}"
                value="${this.defaultValue}"
                min="${this.min}"
                max="${this.max}"
                step="${this.step}"
            />
            <label for="${this.id}">${this.name}</label>
        </div>`;
    }
}

export class SliderOption extends NumberOption {
    generateHtml(): DocumentFragment {
        return html`<div class="settings-slider">
            <input
                type="range"
                id="${this.id}"
                value="${this.defaultValue}"
                min="${this.min}"
                max="${this.max}"
                step="${this.step}"
            />
            <label for="${this.id}">${this.name}</label>
        </div>`;
    }
}

const settingsOptions: SettingsOption<any>[] = [];

const settingsPanel = document.getElementById(
    'settings-panel'
) as HTMLDivElement;

export function addOption(option: SettingsOption<any>) {
    settingsOptions.push(option);

    // Append element to the DOM
    const firstChild = option.element.firstElementChild;
    settingsPanel.appendChild(option.element);

    // After appending to DOM, find the newly added element
    if (firstChild && firstChild.id) {
        // If the first child has an ID, use that to find it
        option.domElement = document.getElementById(firstChild.id);
    } else if (option.id) {
        // Try to find the element containing the input with our option ID
        const input = document.getElementById(option.id);
        if (input) {
            option.domElement = input.closest(
                '.settings-toggle, .settings-input, .settings-slider'
            ) as HTMLElement;
        }
    }
}

const settingsButton = document.getElementById(
    'settings-button'
) as HTMLButtonElement;
const settingsCloseButton = document.getElementById(
    'settings-close'
) as HTMLButtonElement;

settingsButton.addEventListener('click', () => {
    settingsPanel.hidden = false;
    settingsButton.hidden = true;
    togglePause(true); // Pause the game when settings are open
});

settingsPanel.addEventListener('keypress', (event) => {
    if (event.key === 'Escape') {
        settingsPanel.hidden = true;
        settingsButton.hidden = false;
        togglePause(false); // Resume the game when settings are closed
    }
});

settingsCloseButton.addEventListener('click', () => {
    settingsPanel.hidden = true;
    settingsButton.hidden = false;
    togglePause(false); // Resume the game when settings are closed
});

document.getElementById('exit-button')?.addEventListener('click', () => {
    // exit the game
    try {
        getCurrentWindow().close();
    }
    catch (e) {
        console.error('Error closing window:', e);
    }
})

try {
    getCurrentWindow()
} catch (e) {
    // If we can't get the current window, it might be because we're not in a Tauri environment
    console.error('Error getting current window:', e);
    document.getElementById('exit-button')?.remove();
}