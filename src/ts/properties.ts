// region Property IDs
import {RenderLayer} from "./renderlayer/renderlayer";

export const RENDER_LAYERS_PROPERTY_ID: string = "spectre_project_render_layers";

// endregion

// region Property Getters

export function getRenderLayersProperty(): Array<RenderLayer> {
    return getPropertyOrDefault(RENDER_LAYERS_PROPERTY_ID);
}

// Does TypeScript have a nice one-liner way of doing this? Please let me(Kat) know if so
function getPropertyOrDefault(propertyId: string, defaultValue: any = undefined): any {
    if (Project[propertyId]) return Project[propertyId];
    return defaultValue;
}

// endregion

// region Property Management
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

// endregion