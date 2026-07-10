tsdi_agent_chat() {
    local cli_dir
    cli_dir="/home/zhouyou/workspace/core/packages/agents/agent-cli"

    (
        cd "$cli_dir" || exit 1
        npm run chat -- "$@"
    )
    local status=$?

    if builtin history -c 2>/dev/null; then
        builtin history -w 2>/dev/null || true
    fi

    return "$status"
}

