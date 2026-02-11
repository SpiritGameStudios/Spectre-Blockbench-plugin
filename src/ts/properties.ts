import {RenderLayer} from "./renderlayer";

export const RENDER_LAYERS_PROPERTY_ID: string = "spectre_project_render_layers";

export function getRenderLayersProperty(): Array<RenderLayer> {
    return Project[RENDER_LAYERS_PROPERTY_ID] || [];
}



let spectreProperties: Property<any>[] = [];

export function loadSpectreProperties(): void {
    createSpectreProperty(ModelProject, "array", RENDER_LAYERS_PROPERTY_ID, {
        label: "Spectre Render Layers",
        exposed: false
    });
}

export function unloadSpectreProperties(): void {
    for (const property of spectreProperties) {
        property.delete();
    }
}

function createSpectreProperty<T extends keyof IPropertyType>(targetClass: any, type: T, name: string, options?: PropertyOptions): Property<T> {
    let property: Property<T> = new Property(targetClass, type, name, options);
    spectreProperties.push(property);
    return property;
}