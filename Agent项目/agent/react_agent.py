from langchain.agents import create_agent
from model.factory import chat_model
from utils.prompt_loader import load_system_prompts
from agent.tools.agent_tools import (
    get_job_profile_list,
    get_job_profile_detail,
    get_job_relation_graph,
    trigger_generate_job_profile,
    get_transfer_paths_summary,
    preview_csv_match,
)
from agent.tools.middleware import monitor_tool, log_before_model


class ReactAgent:
    def __init__(self):
        self.agent = create_agent(
            model=chat_model,
            system_prompt=load_system_prompts(),
            tools=[
                get_job_profile_list,
                get_job_profile_detail,
                get_job_relation_graph,
                trigger_generate_job_profile,
                get_transfer_paths_summary,
                preview_csv_match,
            ],
            middleware=[monitor_tool, log_before_model],
        )

    def execute_stream(self, query):
        input_dict = {
            "messages": [
                {"role": "user", "content": query},
            ]
        }
        for chunk in self.agent.stream(input_dict, stream_mode="values"):
            latest_message = chunk["messages"][-1]
            if latest_message:
                yield latest_message.content.strip() + "\n"


if __name__ == "__main__":
    agent = ReactAgent()
    for chunk in agent.execute_stream("帮我查看Java后端开发工程师的岗位画像"):
        print(chunk, end="", flush=True)
