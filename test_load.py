import os
BASE_DIR = os.path.dirname(os.path.abspath('ml/main.py'))
EXPORTS = os.path.join(BASE_DIR, 'model_exports')
print('Exports directory:', EXPORTS)
print('Files:', os.listdir(EXPORTS))

from datetime import datetime
for f in os.listdir(EXPORTS):
    path = os.path.join(EXPORTS, f)
    mtime = os.path.getmtime(path)
    print(f"{f}: {datetime.fromtimestamp(mtime)}")
