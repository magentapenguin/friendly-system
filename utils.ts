export function html(strings: TemplateStringsArray, ...values: any[]): DocumentFragment {
    console.log(strings, values);
    const template = document.createElement('template');
    template.innerHTML = strings.reduce((acc, str, i) => {
        return acc + str + (values[i] || '');
    }, '');
    console.log(template.content, template.innerHTML);
    return template.content;
}