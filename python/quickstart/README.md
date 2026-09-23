# Python quickstart

Send one server-side sales tax calculation with the official [`salestax-python`](https://github.com/InstaBlick-USA/salestax-python) SDK and explicit outcome handling.

## Run it

From the repository root:

```bash
cp .env.example .env
python -m venv .venv
source .venv/bin/activate
python -m pip install -r python/quickstart/requirements.txt
python python/quickstart/quickstart.py
```

On PowerShell, replace the copy and activation commands with:

```powershell
Copy-Item .env.example .env
.venv\Scripts\Activate.ps1
```

The script prints the complete calculation response. Update `calculation_request` in [`quickstart.py`](./quickstart.py) with facts from your application before integrating it.

