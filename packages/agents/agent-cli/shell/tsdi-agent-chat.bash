tsdi_agent_chat() {
    local cli_dir
    cli_dir="/home/zhouyou/workspace/core/packages/agents/agent-cli"

    (
        cd "$cli_dir" || exit 1
        npm run chat -- "$@"
    )
    local status=$?

    return "$status"
}
