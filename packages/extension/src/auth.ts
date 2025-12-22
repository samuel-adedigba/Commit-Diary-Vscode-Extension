import * as vscode from 'vscode'

/**
 * Simplified AuthManager - API Key Only
 * 
 * Flow:
 * 1. User registers on web dashboard (OAuth happens there)
 * 2. Dashboard generates API key
 * 3. User pastes API key in VS Code settings
 * 4. Extension uses API key for all cloud operations
 * 
 * No OAuth in extension - keeps it simple and autonomous!
 */
export class AuthManager {
    private context: vscode.ExtensionContext
    private output: vscode.OutputChannel

    constructor(context: vscode.ExtensionContext, output: vscode.OutputChannel) {
        this.context = context
        this.output = output
    }

    /**
     * Check if user has configured API key
     */
    async isAuthenticated(): Promise<boolean> {
        const apiKey = await this.getApiKey()
        return !!apiKey
    }

    /**
     * Get API key from settings (visible) or secrets (legacy)
     */
    async getApiKey(): Promise<string | null> {
        // First check settings (new location)
        const config = vscode.workspace.getConfiguration('commitDiary')
        const settingsApiKey = config.get<string>('apiKey', '').trim()

        if (settingsApiKey) {
            return settingsApiKey
        }

        // Fallback to secrets (for backward compatibility)
        const secretApiKey = await this.context.secrets.get('api_key')
        if (secretApiKey) {
            return secretApiKey
        }

        return null
    }

    /**
     * Get auth token for API requests
     */
    async getAuthToken(): Promise<string | null> {
        return this.getApiKey()
    }

    /**
     * Store API key in secrets
     * Called when user pastes key from dashboard
     */
    async storeApiKey(apiKey: string): Promise<void> {
        await this.context.secrets.store('api_key', apiKey)
        await this.context.globalState.update('auth_timestamp', Date.now())
        this.output.appendLine('[Auth] ✅ API key stored successfully')

        // Show success notification
        vscode.window.showInformationMessage(
            '✅ CommitDiary: API key saved! Cloud sync is now enabled.',
            'View Settings'
        ).then(action => {
            if (action === 'View Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'commitDiary')
            }
        })
    }

    /**
     * Validate API key by making a test request
     */
    async validateApiKey(apiKey?: string): Promise<boolean> {
        try {
            const key = apiKey || await this.getApiKey()

            if (!key) {
                return false
            }

            const config = vscode.workspace.getConfiguration('commitDiary')
            // TODO: Use production API URL (setting removed from package.json to hide from UI)
            // REPLACE WITH PRODUCTION API URL
            //  let apiUrl = config.get<string>('sync.apiUrl', 'http://localhost:3001')
            let apiUrl = config.get<string>('sync.apiUrl', 'https://commitdiary-backend.onrender.com')

            // Ensure URL doesn't have trailing slash for endpoint construction
            apiUrl = apiUrl.replace(/\/$/, '')

            this.output.appendLine(`[Auth] Validating API key with ${apiUrl}...`)

            // Use profile endpoint to validate API key
            const response = await fetch(`${apiUrl}/v1/users/profile`, {
                method: 'GET',
                headers: {
                    'X-API-Key': key
                }
            })

            if (response.ok) {
                this.output.appendLine('[Auth] ✅ API key is valid')
                return true
            } else if (response.status === 401) {
                this.output.appendLine('[Auth] ❌ API key is invalid or expired')
                return false
            } else {
                this.output.appendLine(`[Auth] ⚠️  API validation returned HTTP ${response.status}`)
                // Consider it valid if we get a non-401 error (might be server issue)
                return true
            }

        } catch (error) {
            this.output.appendLine(`[Auth] ❌ API key validation error: ${error}`)
            // On network error, assume key might be valid (offline mode)
            return true
        }
    }

    /**
     * Clear API key (logout equivalent)
     */
    async clearApiKey(): Promise<void> {
        try {
            // Clear from secrets
            await this.context.secrets.delete('api_key')

            // Clear from settings
            const config = vscode.workspace.getConfiguration('commitDiary')
            await config.update('apiKey', '', vscode.ConfigurationTarget.Global)

            // Clear auth state
            await this.context.globalState.update('auth_timestamp', undefined)

            this.output.appendLine('[Auth] API key cleared successfully')
            vscode.window.showInformationMessage('CommitDiary: API key removed. Cloud sync disabled.')

        } catch (error) {
            this.output.appendLine(`[Auth] Clear API key error: ${error}`)
            vscode.window.showErrorMessage(`Failed to clear API key: ${error}`)
        }
    }

    /**
     * Prompt user to register if not authenticated
     */
    async promptRegistration(): Promise<void> {
        const dashboardUrl = vscode.workspace.getConfiguration('commitDiary').get<string>('dashboardUrl', 'https://dashboard.commitdiary.com')

        const action = await vscode.window.showInformationMessage(
            '🚀 CommitDiary: Register for cloud sync to backup and analyze your commits across all devices!',
            { modal: false },
            'Register Now',
            'Learn More',
            'Maybe Later'
        )

        if (action === 'Register Now') {
            await vscode.env.openExternal(vscode.Uri.parse(dashboardUrl))
            this.output.appendLine(`[Auth] Opened dashboard for registration: ${dashboardUrl}`)
        } else if (action === 'Learn More') {
            await vscode.env.openExternal(vscode.Uri.parse('https://github.com/samuel-adedigba/Commit-Diary-Vscode-Extension#cloud-sync'))
            this.output.appendLine('[Auth] Opened documentation')
        }
    }

    /**
     * Show instructions for setting up API key
     */
    async showApiKeyInstructions(): Promise<void> {
        const dashboardUrl = vscode.workspace.getConfiguration('commitDiary').get<string>('dashboardUrl', 'https://dashboard.commitdiary.com')

        const message = `To enable cloud sync:
1. Register at ${dashboardUrl}
2. Generate an API key from your dashboard
3. Copy the key
4. Paste it in VS Code Settings → CommitDiary → API Key
5. Your commits will sync automatically!`

        const action = await vscode.window.showInformationMessage(
            message,
            { modal: true },
            'Open Dashboard',
            'Open Settings'
        )

        if (action === 'Open Dashboard') {
            await vscode.env.openExternal(vscode.Uri.parse(dashboardUrl))
        } else if (action === 'Open Settings') {
            await vscode.commands.executeCommand('workbench.action.openSettings', 'commitDiary.apiKey')
        }
    }
}
