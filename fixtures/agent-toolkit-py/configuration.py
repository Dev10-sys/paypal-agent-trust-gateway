from typing import Optional, Dict, Any

class Context:
    def __init__(self, merchant_id: Optional[str] = None, sandbox: Optional[bool] = None, request_id: Optional[str] = None):
        self.merchant_id = merchant_id
        self.sandbox = sandbox or False
        self.request_id = request_id

class Configuration:
    def __init__(self, actions: Dict[str, Dict[str, bool]], context: Optional[Context] = None):
        self.actions = actions
        self.context = context

def is_tool_allowed(tool: Dict[str, Any], configuration: Configuration) -> bool:
    for product, product_actions in tool.get("actions", {}).items():
        for action, allowed in product_actions.items():
            if configuration.actions.get(product, {}).get(action, False):
                return True
    return False
