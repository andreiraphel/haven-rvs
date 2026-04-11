import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from xgboost import XGBRegressor

print('Testing isolated model')

# Let's see what the MAE (Mean Absolute Error) was on the test set!
