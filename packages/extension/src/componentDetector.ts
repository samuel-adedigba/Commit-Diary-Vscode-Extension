import * as vscode from 'vscode'

export interface ComponentRule {
    pattern: string
    name: string
}

export interface ComponentDetectorConfig {
    rules: ComponentRule[]
}

// Default component detection rules
export const DEFAULT_COMPONENT_RULES: ComponentRule[] = [
    { pattern: '^src/components/', name: 'Components' },
    { pattern: '^src/api/', name: 'API' },
    { pattern: '^src/lib/', name: 'Library' },
    { pattern: '^src/utils/', name: 'Utils' },
    { pattern: '^src/hooks/', name: 'Hooks' },
    { pattern: '^src/services/', name: 'Services' },
    { pattern: '^src/models/', name: 'Models' },
    { pattern: '^src/types/', name: 'Types' },
    { pattern: '^tests?/', name: 'Tests' },
    { pattern: '^__tests__/', name: 'Tests' },
    { pattern: '^spec/', name: 'Tests' },
    { pattern: '^migrations/', name: 'Database' },
    { pattern: '^db/', name: 'Database' },
    { pattern: '^database/', name: 'Database' },
    { pattern: '^docs?/', name: 'Documentation' },
    { pattern: '^config/', name: 'Config' },
    { pattern: '^public/', name: 'Assets' },
    { pattern: '^assets/', name: 'Assets' },
    { pattern: '^styles?/', name: 'Styles' },
    { pattern: '^css/', name: 'Styles' },
    { pattern: '\\.test\\.(ts|js|tsx|jsx)$', name: 'Tests' },
    { pattern: '\\.spec\\.(ts|js|tsx|jsx)$', name: 'Tests' },
    { pattern: '\\.css$', name: 'Styles' },
    { pattern: '\\.scss$', name: 'Styles' },
    { pattern: '\\.md$', name: 'Documentation' },
    { pattern: 'README', name: 'Documentation' },
    { pattern: '^Dockerfile', name: 'Infrastructure' },
    { pattern: '^docker-compose', name: 'Infrastructure' },
    { pattern: '^\\.github/', name: 'CI/CD' },
    { pattern: '^\\.gitlab/', name: 'CI/CD' },
    { pattern: '^azure-pipelines', name: 'CI/CD' },
    { pattern: '^package\\.json$', name: 'Build' },
    { pattern: '^tsconfig\\.json$', name: 'Build' },
    { pattern: '^webpack\\.', name: 'Build' },
    { pattern: '^vite\\.', name: 'Build' },
]

export class ComponentDetector {
    private compiledRules: Array<{ regex: RegExp; name: string }> = []

    constructor(config?: ComponentDetectorConfig) {
        this.loadRules(config)
    }

    private loadRules(config?: ComponentDetectorConfig) {
        const rules = config?.rules || this.getUserConfigRules() || DEFAULT_COMPONENT_RULES

        this.compiledRules = rules.map(rule => ({
            regex: new RegExp(rule.pattern),
            name: rule.name
        }))
    }

    private getUserConfigRules(): ComponentRule[] | null {
        try {
            const vscodeConfig = vscode.workspace.getConfiguration('commitDiary')
            const userRules = vscodeConfig.get<ComponentRule[]>('componentRules')
            
            if (userRules && Array.isArray(userRules) && userRules.length > 0) {
                return userRules
            }
        } catch (e) {
        }
        
        return null
    }

    /**
     * Detect component for a single file path
     */
    detectComponent(filePath: string): string | null {
        // Normalize path separators
        const normalized = filePath.replace(/\\/g, '/')

        for (const rule of this.compiledRules) {
            if (rule.regex.test(normalized)) {
                return rule.name
            }
        }

        // Fallback: try to extract directory-based component
        const parts = normalized.split('/')
        if (parts.length > 1) {
            // Return the first meaningful directory
            for (const part of parts) {
                if (part && part !== '.' && part !== '..' && !part.startsWith('.')) {
                    return this.capitalizeFirst(part)
                }
            }
        }

        return 'Other'
    }

    /**
     * Detect components for multiple files
     */
    detectComponents(filePaths: string[]): string[] {
        const components = new Set<string>()

        for (const filePath of filePaths) {
            const component = this.detectComponent(filePath)
            if (component) {
                components.add(component)
            }
        }

        return Array.from(components)
    }

    /**
     * Detect components and return with file associations
     */
    detectComponentsWithFiles(filePaths: string[]): Array<{ path: string; component: string | null }> {
        return filePaths.map(path => ({
            path,
            component: this.detectComponent(path)
        }))
    }

    /**
     * Reload rules from VS Code configuration
     */
    reload() {
        this.loadRules()
    }

    private capitalizeFirst(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1)
    }
}

// Singleton instance
let detector: ComponentDetector | null = null

export function getComponentDetector(): ComponentDetector {
    if (!detector) {
        detector = new ComponentDetector()
    }
    return detector
}

export function reloadComponentDetector() {
    detector = new ComponentDetector()
}
